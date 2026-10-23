import { jest } from '@jest/globals';
import { mountViewer } from './helpers/vue-viewer.js';

const minimal = (fields = {}, annotations = {}) => JSON.stringify({ format: 'vaRRI', version: 1,
  fields: { sequence: 'ACGU&UGCA', structure: '((..&..))', ...fields }, annotations });
let fixture;
afterEach(async () => { await fixture?.close(); fixture = null; });

test('all example settings and annotations survive JSON replacement, including text and signed profiles', async () => {
  fixture = await mountViewer();
  const { view, api, examples } = fixture;
  for (const key of Object.keys(examples)) {
    await view.actions.loadExample(key);
    api.registerTextAnnotation({ text: 'α & <test>', position: { x: -5, y: 10 }, color: 'navy', italic: true });
    view.state.rotation = 47;
    const beforeURL = view.actions.generateShareableURL();
    const saved = view.actions.generateJSON();
    await view.actions.loadExample(key === '2mol' ? 'wu-2024' : '2mol');
    expect(await view.actions.loadJSON(saved)).toBe(true);
    expect(view.state.message.text).toBe('');
    expect(view.actions.generateShareableURL()).toBe(beforeURL);
    expect(view.actions.generateJSON()).toBe(saved);
    expect(view.state.selectedExample).toBeNull();
  }
});

test('partial JSON resets omitted settings, annotations and full-screen state instead of retaining the previous figure', async () => {
  fixture = await mountViewer();
  const { view, api } = fixture;
  view.state.fields.hideFooterAndHeader = true;
  view.state.renderingOnly = true;
  expect(await view.actions.loadJSON(minimal())).toBe(true);
  expect(view.state.fields.hideFooterAndHeader).toBe(false);
  expect(view.state.renderingOnly).toBe(false);
  expect(document.body.classList.contains('hide-footer-and-header')).toBe(false);
  expect(document.body.classList.contains('rendering-only')).toBe(false);
  expect(view.state.fields.profileData1).toBe('');
  expect(api.getSubsequenceHighlights()).toEqual([]);
  expect(api.getPointMutations()).toEqual([]);
  expect(view.state.rotation).toBe(0);
});

test.each([
  '{broken', minimal({ structure: '...' }), minimal({ startIndex1: '0' }),
  minimal({ profileData1: '500 0.5' }),
  minimal({}, { pointMutations: [{ sequence: 1, position: 500, replacement: 'G' }] }),
  minimal({}, { textAnnotations: [{ text: '' }] }),
])('invalid JSON or data leaves the existing figure intact', async input => {
  fixture = await mountViewer();
  const { view, renderSpy } = fixture;
  const saved = view.actions.generateJSON();
  const calls = renderSpy.mock.calls.length;
  expect(await view.actions.loadJSON(input)).toBe(false);
  expect(view.state.message.text).toMatch(/^JSON load error:/);
  expect(view.actions.generateJSON()).toBe(saved);
  expect(renderSpy).toHaveBeenCalledTimes(calls);
});

test('file selection and drop both load JSON, allow the same file again and reject multiple files', async () => {
  fixture = await mountViewer();
  const { view } = fixture;
  const file = new window.File([minimal()], 'session.json', { type: 'application/json' });
  const target = { files: [file], value: 'session.json' };
  expect(await view.actions.selectJSONFile({ target })).toBe(true);
  expect(target.value).toBe('');
  await view.actions.loadExample('2mol');
  const button = document.getElementById('loadJsonBtn');
  button.classList.add('drag-over');
  expect(await view.actions.dropJSONFile({ currentTarget: button, dataTransfer: { files: [file] } })).toBe(true);
  expect(button.classList.contains('drag-over')).toBe(false);
  const saved = view.actions.generateJSON();
  expect(await view.actions.dropJSONFile({ currentTarget: button, dataTransfer: { files: [file, file] } })).toBe(false);
  expect(view.state.message.text).toMatch(/one JSON file/);
  expect(view.actions.generateJSON()).toBe(saved);
});

test.each(['clear', 'example', 'unmount', 'newer file'])('pending file reads cannot overwrite %s', async operation => {
  fixture = await mountViewer();
  const readers = [];
  window.FileReader = class {
    constructor() { readers.push(this); }
    readAsText() {}
    abort() { this.onabort(); }
  };
  const { view, renderSpy } = fixture;
  const select = () => view.actions.selectJSONFile({ target: { files: [{}], value: '' } });
  const pending = select();
  let replacement;
  if (operation === 'clear') view.actions.clearAll();
  if (operation === 'example') await view.actions.loadExample('wu-2024');
  if (operation === 'unmount') view.unmount();
  if (operation === 'newer file') {
    replacement = select();
    readers[1].result = minimal({ seqName1: 'New file' });
    readers[1].onload();
    await replacement;
  }
  const saved = view.actions.generateJSON();
  const calls = renderSpy.mock.calls.length;
  readers[0].result = minimal({ seqName1: 'Stale file' });
  readers[0].onload();
  expect(await pending).toBe(false);
  expect(view.actions.generateJSON()).toBe(saved);
  expect(renderSpy).toHaveBeenCalledTimes(calls);
  expect(view.state.jsonLoading).toBe(false);
});

test('unreadable files report an error without replacing the session', async () => {
  fixture = await mountViewer();
  window.FileReader = class { readAsText() { this.onerror(); } };
  const { view } = fixture;
  const saved = view.actions.generateJSON();
  expect(await view.actions.selectJSONFile({ target: { files: [{}], value: '' } })).toBe(false);
  expect(view.state.message.text).toMatch(/Could not read/);
  expect(view.actions.generateJSON()).toBe(saved);
});

test('Store downloads JSON and releases object URLs on disposal', async () => {
  fixture = await mountViewer();
  const { view } = fixture;
  window.URL.createObjectURL = jest.fn(() => 'blob:session');
  window.URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  document.getElementById('storeJsonBtn').click();
  expect(window.URL.createObjectURL).toHaveBeenCalledWith(expect.any(window.Blob));
  expect(click.mock.contexts[0].download).toBe('vaRRI_session.json');
  expect(document.querySelector('a[download]')).toBeNull();
  view.unmount();
  expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:session');
});
