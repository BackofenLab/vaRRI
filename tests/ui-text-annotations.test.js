import { jest } from '@jest/globals';
import { mountViewer } from './helpers/vue-viewer.js';

function editField(id, value) {
  const input = document.getElementById(id);
  if (input.type === 'checkbox') input.checked = value;
  else input.value = value;
  input.dispatchEvent(new window.Event(input.type === 'checkbox' ? 'change' : 'input', { bubbles: true }));
}

function transfer() {
  const values = new Map();
  return { get types() { return [...values.keys()]; },
    setData: (type, value) => values.set(type, value), getData: type => values.get(type) || '' };
}

function dragEvent(type, dataTransfer, coordinates = {}) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { dataTransfer, ...coordinates });
  return event;
}

async function addDialog(viewer) {
  document.getElementById('textAnnotationSubmitBtn').click();
  await viewer.flush();
  expect(document.getElementById('textAnnotationDialog').open).toBe(true);
}

async function saveDialog(viewer) {
  document.querySelector('#textAnnotationDialog button[value="ok"]').click();
  await viewer.flush();
}

test('text annotation controls add, style, edit and remove plain text without rerendering the graph', async () => {
  const viewer = await mountViewer();
  try {
    const refresh = jest.spyOn(viewer.api, 'refreshTextAnnotations');
    viewer.renderSpy.mockClear();
    await addDialog(viewer);
    editField('textAnnotationText', 'Binding <site> α & β');
    editField('textAnnotationBold', true);
    editField('textAnnotationItalic', true);
    editField('textAnnotationSize', '23.5');
    editField('textAnnotationColor', '#123456');
    await viewer.flush();
    await saveDialog(viewer);
    expect(document.getElementById('textAnnotationDialog').open).toBe(false);

    const [annotation] = viewer.api.getTextAnnotations();
    expect(annotation).toMatchObject({ text: 'Binding <site> α & β', bold: true, italic: true,
      size: 23.5, color: '#123456', position: null });
    const item = document.querySelector('#text-annotation-list .text-annotation-item');
    const preview = item.querySelector('.text-annotation-preview');
    expect(preview.textContent).toBe('Binding <site> α & β');
    expect(preview.querySelector('site')).toBeNull();
    expect(preview.style.fontSize).toBe('23.5px');
    expect(preview.style.fontWeight).toBe('bold');
    expect(preview.style.fontStyle).toBe('italic');
    expect(item.querySelector('.text-annotation-status').getAttribute('aria-label')).toBe('Unpositioned');
    expect(preview.draggable).toBe(true);
    expect(document.getElementById('textAnnotationText').value).toBe('');
    expect(document.getElementById('textAnnotationBold').checked).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(viewer.renderSpy).not.toHaveBeenCalled();

    viewer.api.updateTextAnnotation(annotation.id, { position: { x: 10, y: 20 } });
    viewer.view.actions.syncAnnotations();
    await viewer.flush();
    preview.click();
    await viewer.flush();
    expect(document.getElementById('textAnnotationDialog').open).toBe(true);
    expect(document.querySelector('#textAnnotationDialog .dialog-header').textContent).toContain('Edit Text Annotation');
    editField('textAnnotationText', 'Edited annotation');
    await saveDialog(viewer);
    expect(viewer.api.getTextAnnotations()).toHaveLength(1);
    expect(viewer.api.getTextAnnotations()[0]).toMatchObject({ id: annotation.id,
      text: 'Edited annotation', position: { x: 10, y: 20 } });
    expect(item.querySelector('.text-annotation-status').getAttribute('aria-label')).toBe('Positioned');
    expect(preview.draggable).toBe(false);

    item.querySelector('.highlight-delete').click();
    await viewer.flush();
    expect(viewer.api.getTextAnnotations()).toEqual([]);
    expect(document.querySelector('#text-annotation-list .highlight-empty').textContent).toContain('No text');
    expect(viewer.renderSpy).not.toHaveBeenCalled();
  } finally { await viewer.close(); }
});

test('free text can be added before sequence input, validates style, and clears drafts independently', async () => {
  const viewer = await mountViewer();
  try {
    viewer.view.actions.clearAll();
    await addDialog(viewer);
    editField('textAnnotationText', '  ');
    expect(viewer.view.actions.submitTextAnnotationForm()).toBe(false);
    expect(viewer.view.state.errors.textAnnotationText).toBeTruthy();
    editField('textAnnotationText', 'Experiment 1');
    editField('textAnnotationSize', '0');
    expect(viewer.view.actions.submitTextAnnotationForm()).toBe(false);
    expect(viewer.view.state.errors.textAnnotationSize).toBeTruthy();
    editField('textAnnotationSize', '16');
    expect(viewer.view.actions.submitTextAnnotationForm()).toBe(true);
    await viewer.flush();
    expect(viewer.api.getTextAnnotations()).toHaveLength(1);
    expect(viewer.view.state.fields.sequence).toBe('');
    document.querySelector('.text-annotation-preview').click();
    await viewer.flush();
    document.getElementById('textAnnotationClearBtn').click();
    await viewer.flush();
    expect(viewer.view.state.fields.textAnnotationEditId).toBe(String(viewer.api.getTextAnnotations()[0].id));
    expect(viewer.view.state.fields.textAnnotationText).toBe('');
    expect(viewer.api.getTextAnnotations()).toHaveLength(1);
    expect(viewer.view.state.errors).toEqual({});
    document.getElementById('textAnnotationClearAllBtn').click();
    await viewer.flush();
    expect(viewer.api.getTextAnnotations()).toEqual([]);
    expect(new URL(viewer.view.actions.generateShareableURL()).searchParams.get('textAnnotations')).toBe('[]');
  } finally { await viewer.close(); }
});

test('text dialogs cancel draft changes and the text panel follows visualization settings', async () => {
  const viewer = await mountViewer();
  try {
    const panels = [...document.querySelectorAll('.controls-column > aside')];
    expect(panels.slice(0, 4).map(panel => panel.getAttribute('aria-label')))
      .toEqual(['Sequence and structure input', 'Visualization settings', 'Text annotations', 'Region highlights']);
    await addDialog(viewer);
    editField('textAnnotationText', 'Discard this');
    editField('textAnnotationSize', '0');
    await viewer.flush();
    const dialog = document.getElementById('textAnnotationDialog');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent).toContain('Add Text Annotation');
    expect(document.getElementById('textAnnotationSize').checkValidity()).toBe(false);
    const cancel = document.querySelector('#textAnnotationDialog button[value="cancel"]');
    expect(cancel.formNoValidate).toBe(true);
    // JSDOM does not honor formnovalidate on button activation; the browser suite
    // checks native activation while this dispatch exercises cancellation actions.
    dialog.querySelector('form').dispatchEvent(new window.SubmitEvent('submit', {
      bubbles: true, cancelable: true, submitter: cancel,
    }));
    await viewer.flush();
    expect(viewer.api.getTextAnnotations()).toEqual([]);
    expect(viewer.view.state.fields.textAnnotationText).toBe('');
    expect(document.getElementById('textAnnotationDialog').open).toBe(false);
  } finally { await viewer.close(); }
});

test('small canvas labels keep readable list previews without changing their stored or edited size', async () => {
  const viewer = await mountViewer();
  try {
    const annotation = viewer.api.registerTextAnnotation({ text: 'Seq. 1', size: 6.4 });
    viewer.view.actions.syncAnnotations();
    await viewer.flush();
    const preview = document.querySelector('.text-annotation-preview');
    expect(preview.style.fontSize).toBe('12px');
    expect(viewer.api.getTextAnnotations()[0].size).toBe(6.4);
    preview.click();
    await viewer.flush();
    expect(document.getElementById('textAnnotationSize').value).toBe('6.4');
    expect(viewer.api.getTextAnnotations()[0].id).toBe(annotation.id);
  } finally { await viewer.close(); }
});

test('text styles and placement survive shared URLs while editor drafts are omitted', async () => {
  const viewer = await mountViewer();
  try {
    viewer.api.registerTextAnnotation({ text: 'Label α: &, + <tag>', bold: true, italic: true,
      size: 21, color: '#123456', position: { x: -24.5, y: 3.25 } });
    viewer.api.registerTextAnnotation({ text: 'Unplaced', position: null });
    editField('textAnnotationText', 'Unsaved draft');
    const params = new URL(viewer.view.actions.generateShareableURL()).searchParams;
    for (const key of params.keys()) expect(key.startsWith('textAnnotation') && key !== 'textAnnotations').toBe(false);
    viewer.view.actions.clearAll();
    viewer.view.actions.loadAllUrlParameters(params);
    await viewer.flush();
    expect(viewer.api.getTextAnnotations()).toEqual([
      expect.objectContaining({ text: 'Label α: &, + <tag>', bold: true, italic: true, size: 21,
        color: '#123456', position: { x: -24.5, y: 3.25 } }),
      expect.objectContaining({ text: 'Unplaced', position: null }),
    ]);
    expect(document.querySelectorAll('#text-annotation-list .text-annotation-item')).toHaveLength(2);
    expect(document.getElementById('textAnnotationText').value).toBe('');
  } finally { await viewer.close(); }
});

test('list drops accept only this viewer drag and delegate client coordinates to the core', async () => {
  const viewer = await mountViewer();
  try {
    const annotation = viewer.api.registerTextAnnotation({ text: 'Drag me' });
    viewer.view.actions.syncAnnotations();
    const placement = jest.spyOn(viewer.api, 'placeTextAnnotation').mockImplementation((id, x, y) =>
      viewer.api.updateTextAnnotation(id, { position: { x, y } }));
    await viewer.flush();
    const dataTransfer = transfer();
    const canvas = document.getElementById('rendering-canvas');
    dataTransfer.setData('application/x-varri-text-annotation', String(annotation.id));
    canvas.dispatchEvent(dragEvent('drop', dataTransfer, { clientX: 30, clientY: 40 }));
    expect(placement).not.toHaveBeenCalled();

    document.querySelector('.text-annotation-preview').dispatchEvent(dragEvent('dragstart', dataTransfer));
    const over = dragEvent('dragover', dataTransfer);
    canvas.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    expect(canvas.classList.contains('text-annotation-drop-target')).toBe(true);
    canvas.dispatchEvent(dragEvent('drop', dataTransfer, { clientX: 123, clientY: 456 }));
    await viewer.flush();
    expect(placement).toHaveBeenCalledWith(annotation.id, 123, 456);
    expect(canvas.classList.contains('text-annotation-drop-target')).toBe(false);
    expect(document.querySelector('.text-annotation-status').getAttribute('aria-label')).toBe('Positioned');
    canvas.dispatchEvent(dragEvent('drop', dataTransfer, { clientX: 10, clientY: 20 }));
    expect(placement).toHaveBeenCalledTimes(1);
  } finally { await viewer.close(); }
});

test('clearing the viewer cancels pending text placement', async () => {
  const viewer = await mountViewer();
  try {
    viewer.api.registerTextAnnotation({ text: 'Cancel this drag' });
    viewer.view.actions.syncAnnotations();
    await viewer.flush();
    const placement = jest.spyOn(viewer.api, 'placeTextAnnotation');
    const dataTransfer = transfer();
    document.querySelector('.text-annotation-preview').dispatchEvent(dragEvent('dragstart', dataTransfer));
    viewer.view.actions.clearAll();
    document.getElementById('rendering-canvas').dispatchEvent(dragEvent('drop', dataTransfer, { clientX: 10, clientY: 20 }));
    expect(placement).not.toHaveBeenCalled();
    expect(viewer.api.getTextAnnotations()).toEqual([]);
  } finally { await viewer.close(); }
});
