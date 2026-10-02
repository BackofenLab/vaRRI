import { jest } from '@jest/globals';
import { crc32 } from 'node:zlib';
import { createCanvas } from 'canvas';
import { JSDOM } from 'jsdom';
import { setPNGDensity } from '../src/core/canvas/png-density.js';
import { validatePNGOptions } from '../src/core/model/png-options.js';
import { downloadPNG } from '../src/core/canvas/export.js';

function chunks(bytes) {
  const result = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    result.push({ type: bytes.toString('ascii', offset + 4, offset + 8),
      data: bytes.subarray(offset + 8, offset + 8 + length),
      crc: bytes.readUInt32BE(offset + 8 + length),
      checkedBytes: bytes.subarray(offset + 4, offset + 8 + length) });
    offset += length + 12;
  }
  return result;
}

test('DPI inserts or replaces one valid pHYs chunk without changing encoded pixels', () => {
  const original = createCanvas(12, 8).toBuffer('image/png');
  let png = original;
  for (const dpi of [96, 300, 72.5]) {
    png = Buffer.concat(setPNGDensity(png, dpi));
    const parsed = chunks(png);
    const physical = parsed.filter(chunk => chunk.type === 'pHYs');
    expect(physical).toHaveLength(1);
    expect(physical[0].data.readUInt32BE(0)).toBe(Math.round(dpi / 0.0254));
    expect(physical[0].data.readUInt32BE(4)).toBe(Math.round(dpi / 0.0254));
    expect(physical[0].data[8]).toBe(1);
    expect(parsed.findIndex(chunk => chunk.type === 'pHYs'))
      .toBeLessThan(parsed.findIndex(chunk => chunk.type === 'IDAT'));
    for (const chunk of parsed) expect(chunk.crc).toBe(crc32(chunk.checkedBytes));
    expect(parsed.filter(chunk => chunk.type !== 'pHYs'))
      .toEqual(chunks(original).filter(chunk => chunk.type !== 'pHYs'));
  }
});

test.each([
  { width: 0 }, { height: -1 }, { width: 1.5 }, { width: Infinity },
  { width: 16385 }, { width: 16384, height: 16384 }, { dpi: 0 }, { dpi: NaN }, { dpi: 100001 },
])('rejects invalid or excessive PNG settings: %j', invalid => {
  expect(() => validatePNGOptions({ width: 800, height: 600, dpi: 96, ...invalid })).toThrow();
});

function exportSession({ failImages = 0, encode = true, context = true } = {}) {
  const dom = new JSDOM('<div id="viewer"><svg xmlns="http://www.w3.org/2000/svg"></svg></div>');
  const document = dom.window.document;
  const svg = document.querySelector('svg');
  Object.defineProperties(svg, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
  const png = createCanvas(1, 1).toBuffer('image/png');
  const canvas = { width: 0, height: 0, getContext: () => context ? {
    fillRect() {}, drawImage() {},
  } : null, toBlob: callback => callback(encode ? new Blob([png]) : null) };
  const create = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation(tag => tag === 'canvas' ? canvas : create(tag));
  const click = jest.spyOn(dom.window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const urls = { createObjectURL: jest.fn(() => 'blob:test'), revokeObjectURL: jest.fn() };
  const window = { Blob, URL: urls, XMLSerializer: dom.window.XMLSerializer,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    FileReader: class {
      async readAsDataURL(blob) {
        this.result = 'data:image/png;base64,' + Buffer.from(await blob.arrayBuffer()).toString('base64');
        this.onload?.();
      }
      abort() {}
    },
    Image: class {
      set src(value) {
        if (value) queueMicrotask(() => {
          if (failImages-- > 0) this.onerror?.();
          else this.onload?.();
        });
      }
    },
  };
  return { session: { dom: document, window }, dom, canvas, urls, click };
}

test.each([undefined, 2, 1.234, { width: 1200, height: 900, dpi: 300 }])('supports legacy scale and explicit PNG options: %j', options => {
  const { session, dom, canvas, urls, click } = exportSession();
  const dimensions = [];
  const toBlob = canvas.toBlob;
  canvas.toBlob = callback => { dimensions.push([canvas.width, canvas.height]); toBlob(callback); };
  return downloadPNG(session, 'viewer', 'figure.png', options).then(() => {
    const scale = options ?? 2;
    expect(dimensions).toEqual([typeof scale === 'number'
      ? [Math.floor(400 * scale), Math.floor(300 * scale)] : [1200, 900]]);
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.instances[0].download).toBe('figure.png');
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
    // The browser may read this after the export Promise resolves or the user
    // finishes choosing a file location. It must not depend on a revoked URL.
    const href = click.mock.instances[0].href;
    expect(href).toMatch(/^data:image\/png;base64,/);
    const saved = chunks(Buffer.from(href.split(',')[1], 'base64'));
    expect(saved.find(chunk => chunk.type === 'pHYs').data.readUInt32BE(0))
      .toBe(Math.round((options?.dpi ?? 96) / 0.0254));
    expect(canvas.width).toBe(0);
  }).finally(() => dom.window.close());
});

test('a missing visualization still throws synchronously for legacy callers', () => {
  const { session, dom } = exportSession();
  try {
    expect(() => downloadPNG(session, 'missing')).toThrow('No SVG found in container');
  } finally { dom.window.close(); }
});

test.each([{ failImages: 2 }, { encode: false }, { context: false }])('reports asynchronous export failures: %j', async failure => {
  const { session, dom, urls, click } = exportSession(failure);
  try {
    await expect(downloadPNG(session, 'viewer')).rejects.toThrow();
    expect(click).not.toHaveBeenCalled();
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
  } finally { dom.window.close(); }
});

test('SVG data URI fallback still exports when the blob image cannot load', async () => {
  const { session, dom, click } = exportSession({ failImages: 1 });
  try {
    await downloadPNG(session, 'viewer');
    expect(click).toHaveBeenCalledTimes(1);
  } finally { dom.window.close(); }
});

test('cancelling a pending export prevents a late download and releases the source URL', async () => {
  const { session, dom, urls, click } = exportSession();
  const controller = new AbortController();
  try {
    const pending = downloadPNG(session, 'viewer', 'figure.png', {
      width: 800, height: 600, signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    expect(click).not.toHaveBeenCalled();
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
  } finally { dom.window.close(); }
});

test.each(['error event', 'synchronous error'])('reports download URL preparation failures: %s', async failure => {
  const { session, dom, click } = exportSession();
  session.window.FileReader = class {
    error = new Error('Cannot read PNG');
    readAsDataURL() {
      if (failure === 'synchronous error') throw this.error;
      this.onerror();
    }
  };
  try {
    await expect(downloadPNG(session, 'viewer')).rejects.toThrow('Cannot read PNG');
    expect(click).not.toHaveBeenCalled();
  } finally { dom.window.close(); }
});

test('cancelling while preparing the download URL prevents a late download', async () => {
  const { session, dom, click } = exportSession();
  const controller = new AbortController();
  session.window.FileReader = class {
    readAsDataURL() { controller.abort(); }
    abort() {}
  };
  try {
    await expect(downloadPNG(session, 'viewer', 'figure.png', {
      width: 800, height: 600, signal: controller.signal,
    })).rejects.toHaveProperty('name', 'AbortError');
    expect(click).not.toHaveBeenCalled();
  } finally { dom.window.close(); }
});
