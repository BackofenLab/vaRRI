import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';

export async function mountViewer(options = {}) {
  jest.resetModules();
  const html = fs.readFileSync(path.join(import.meta.dirname, '../../index.html'), 'utf8');
  const dom = new JSDOM(html, { url: options.url || 'http://localhost/' });
  const previous = new Map();
  const expose = (name, value) => {
    previous.set(name, Object.getOwnPropertyDescriptor(global, name));
    Object.defineProperty(global, name, { configurable: true, writable: true, value });
  };
  expose('window', dom.window);
  expose('document', dom.window.document);
  for (const key of ['navigator', 'Element', 'HTMLElement', 'HTMLDialogElement', 'SVGElement', 'Node', 'Event',
    'MouseEvent', 'KeyboardEvent', 'File', 'FileReader', 'Blob']) expose(key, dom.window[key]);
  class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
  expose('ResizeObserver', ResizeObserverStub);
  dom.window.ResizeObserver = ResizeObserverStub;
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function (value) {
    this.returnValue = value || '';
    this.open = false;
    this.dispatchEvent(new dom.window.Event('close'));
  };
  const { createVaRRI } = await import('../../src/vaRRI.js');
  const api = createVaRRI({ document: dom.window.document });
  const renderSpy = jest.spyOn(api, 'render').mockResolvedValue({ cancelled: false });
  const imported = await import('../../example-data.js');
  const examples = { ...(imported.default || imported) };
  options.modifyExamples?.(examples);
  const { createViewerApp } = await import('../../src/ui/bootstrap.js');
  const { nextTick } = await import('vue');
  const view = createViewerApp({ document: dom.window.document, api, examples });
  const flush = async () => {
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    await nextTick();
  };
  await view.ready;
  await flush();
  return { dom, api, renderSpy, view, examples, flush,
    async close() {
      view.unmount();
      await flush();
      dom.window.close();
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(global, name, descriptor);
        else delete global[name];
      }
    },
  };
}

