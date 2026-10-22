import { jest } from '@jest/globals';
import { mountViewer } from './helpers/vue-viewer.js';

let viewer, document;
beforeEach(async () => {
  viewer = await mountViewer();
  document = viewer.dom.window.document;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  Object.defineProperties(svg, { clientWidth: { value: 640, configurable: true },
    clientHeight: { value: 480, configurable: true } });
  document.getElementById('rendering-canvas').append(svg);
});
afterEach(async () => viewer.close());

async function open() {
  document.getElementById('exportPngBtn').click();
  await viewer.flush();
}
async function input(id, value) {
  const element = document.getElementById(id);
  element.value = value;
  element.dispatchEvent(new viewer.dom.window.Event('input', { bubbles: true }));
  await viewer.flush();
}

test('prefills current canvas dimensions each time and links both dimension edits without drift', async () => {
  await open();
  expect(document.getElementById('pngExportDialog').open).toBe(true);
  expect(document.getElementById('pngWidth').value).toBe('640');
  expect(document.getElementById('pngHeight').value).toBe('480');
  expect(document.getElementById('pngDpi').value).toBe('96');
  await input('pngWidth', '1001');
  expect(document.getElementById('pngHeight').value).toBe('751');
  await input('pngHeight', '1200');
  expect(document.getElementById('pngWidth').value).toBe('1600');
  await input('pngDpi', '300');
  expect(document.getElementById('pngWidth').value).toBe('1600');
  document.querySelector('#pngExportDialog button[value="cancel"]').click();
  await viewer.flush();
  Object.defineProperty(document.querySelector('#rendering-canvas svg'), 'clientWidth', { value: 960 });
  await open();
  expect(document.getElementById('pngWidth').value).toBe('960');
});

test('Export PNG passes the requested dimensions and DPI to the browser download', async () => {
  const download = jest.spyOn(viewer.api, 'downloadPNG').mockResolvedValue();
  await open();
  await input('pngWidth', '1280');
  await input('pngDpi', '300');
  document.querySelector('#pngExportDialog button[value="ok"]').click();
  await viewer.flush();
  expect(download).toHaveBeenCalledWith('rendering-canvas', 'vaRRI_output.png', expect.objectContaining({
    width: 1280, height: 960, dpi: 300,
  }));
  expect(document.getElementById('pngExportDialog').open).toBe(false);
});

test('Cancel works with an empty required input and never downloads', async () => {
  const download = jest.spyOn(viewer.api, 'downloadPNG').mockResolvedValue();
  await open();
  await input('pngWidth', '');
  // jsdom lacks submitter/formnovalidate handling; real-browser coverage tests the button.
  viewer.view.actions.submitDialog('pngExportDialog', { preventDefault() {}, submitter: { value: 'cancel' } });
  await viewer.flush();
  expect(document.getElementById('pngExportDialog').open).toBe(false);
  expect(download).not.toHaveBeenCalled();
});

test('reports asynchronous failures in the open dialog and allows retry', async () => {
  const download = jest.spyOn(viewer.api, 'downloadPNG')
    .mockRejectedValueOnce(new Error('Encoding failed')).mockResolvedValue();
  await open();
  document.querySelector('#pngExportDialog button[value="ok"]').click();
  await viewer.flush();
  expect(document.getElementById('pngExportDialog').open).toBe(true);
  expect(document.querySelector('#pngExportDialog [role="alert"]').textContent).toContain('Encoding failed');
  expect(document.querySelector('#pngExportDialog button[value="ok"]').disabled).toBe(false);
  document.querySelector('#pngExportDialog button[value="ok"]').click();
  await viewer.flush();
  expect(download).toHaveBeenCalledTimes(2);
  expect(document.getElementById('pngExportDialog').open).toBe(false);
});

test.each(['cancel', 'clear', 'unmount'])('%s aborts a pending PNG export', async action => {
  let finish;
  const download = jest.spyOn(viewer.api, 'downloadPNG').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await open();
  document.querySelector('#pngExportDialog button[value="ok"]').click();
  await viewer.flush();
  expect(document.querySelector('#pngExportDialog button[value="ok"]').disabled).toBe(true);
  if (action === 'clear') viewer.view.actions.clearAll();
  else if (action === 'unmount') viewer.view.unmount();
  else document.querySelector('#pngExportDialog button[value="cancel"]').click();
  await viewer.flush();
  expect(download.mock.calls[0][2].signal.aborted).toBe(true);
  finish();
  await viewer.flush();
  expect(viewer.view.state.pngExport.busy).toBe(false);
});

test('rejects excessive total pixel count and missing visualizations', async () => {
  const download = jest.spyOn(viewer.api, 'downloadPNG').mockResolvedValue();
  await open();
  await input('pngWidth', '16000');
  document.querySelector('#pngExportDialog button[value="ok"]').click();
  await viewer.flush();
  expect(document.querySelector('#pngExportDialog [role="alert"]').textContent).toContain('64 megapixels');
  expect(download).not.toHaveBeenCalled();
  viewer.view.actions.clearAll();
  await viewer.flush();
  await open();
  expect(document.getElementById('pngExportDialog').open).toBe(false);
  expect(viewer.view.state.message.text).toContain('Render a visualization');
});
