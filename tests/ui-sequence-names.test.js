import { jest } from '@jest/globals';
import { mountViewer } from './helpers/vue-viewer.js';

function changeField(id, value) {
  const input = document.getElementById(id);
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
}

test('sequence name fields and named annotation dialogs synchronize without rerendering RNA', async () => {
  const viewer = await mountViewer();
  try {
    const annotation = viewer.api.registerTextAnnotation({ text: 'Seq. 1', sequenceNameFor: '1',
      size: 6.4, position: { x: 12, y: 34 } });
    viewer.view.actions.syncAnnotations();
    await viewer.flush();
    viewer.renderSpy.mockClear();
    const refresh = jest.spyOn(viewer.api, 'refreshTextAnnotations');
    changeField('seq1name', 'RNA alpha');
    await viewer.flush();
    expect(viewer.api.getSequenceNames().seq1name).toBe('RNA alpha');
    expect(viewer.api.getTextAnnotations()[0]).toMatchObject({ id: annotation.id,
      text: 'RNA alpha', position: { x: 12, y: 34 }, size: 6.4 });
    const row = document.querySelector('[data-sequence-name-for="1"]');
    expect(row.querySelector('.text-annotation-kind').textContent).toBe('Sequence 1 name');
    expect(document.getElementById('seq1name').style.backgroundColor).not.toBe('');
    expect(document.getElementById('seq1name').style.backgroundColor)
      .not.toBe(document.getElementById('seq2name').style.backgroundColor);
    row.querySelector('.text-annotation-preview').click();
    await viewer.flush();
    expect(document.querySelector('#textAnnotationDialog .dialog-header').textContent).toContain('Sequence 1 Name');
    changeField('textAnnotationText', 'RNA renamed in dialog');
    document.querySelector('#textAnnotationDialog button[value="ok"]').click();
    await viewer.flush();
    expect(document.getElementById('seq1name').value).toBe('RNA renamed in dialog');
    expect(viewer.api.getSequenceNames().seq1name).toBe('RNA renamed in dialog');
    expect(viewer.api.getTextAnnotations()[0].sequenceNameFor).toBe('1');
    expect(refresh).toHaveBeenCalled();
    expect(viewer.renderSpy).not.toHaveBeenCalled();
    row.querySelector('.text-annotation-preview').click();
    await viewer.flush();
    document.getElementById('textAnnotationClearBtn').click();
    await viewer.flush();
    expect(viewer.view.state.fields.textAnnotationEditId).toBe(String(annotation.id));
    document.querySelector('#textAnnotationDialog button[value="ok"]').click();
    await viewer.flush();
    expect(document.getElementById('textAnnotationDialog').open).toBe(false);
    expect(viewer.api.getTextAnnotations()).toEqual([
      expect.objectContaining({ id: annotation.id, text: 'Seq. 1', sequenceNameFor: '1' }),
    ]);
    changeField('seq1name', '  ');
    await viewer.flush();
    expect(document.getElementById('seq1name').value).toBe('Seq. 1');
    expect(viewer.api.getTextAnnotations()[0].text).toBe('Seq. 1');
  } finally { await viewer.close(); }
});

test('deleting or clearing sequence-name labels only unpositions them', async () => {
  const viewer = await mountViewer();
  try {
    const annotation = viewer.api.registerTextAnnotation({ text: 'RNA alpha', sequenceNameFor: '1',
      position: { x: 12, y: 34 } });
    viewer.api.registerTextAnnotation({ text: 'User label' });
    viewer.view.actions.syncAnnotations();
    await viewer.flush();
    const row = document.querySelector('[data-sequence-name-for="1"]');
    expect(row.querySelector('.highlight-delete').getAttribute('aria-label')).toBe('Unposition sequence 1 name');
    row.querySelector('.highlight-delete').click();
    await viewer.flush();
    expect(viewer.api.getTextAnnotations()).toHaveLength(2);
    expect(viewer.api.getTextAnnotations()[0]).toMatchObject({ id: annotation.id,
      sequenceNameFor: '1', text: 'RNA alpha', position: null, anchor: null });
    expect(row.querySelector('.text-annotation-status').getAttribute('aria-label')).toBe('Unpositioned');
    expect(row.querySelector('.text-annotation-preview').draggable).toBe(true);
    document.getElementById('textAnnotationClearAllBtn').click();
    await viewer.flush();
    expect(viewer.api.getTextAnnotations()).toEqual([expect.objectContaining({ id: annotation.id, position: null })]);
    expect(document.getElementById('seq1name').value).toBe('RNA alpha');
  } finally { await viewer.close(); }
});

test('sequence name URL fields override label text and survive shared links', async () => {
  const viewer = await mountViewer();
  try {
    const params = new URLSearchParams({ sequence: 'ACGU&UGCA', structure: '((..&..))',
      seq1name: 'Explicit α & β', seq2name: 'Other RNA', textAnnotations: JSON.stringify([
        { text: 'Outdated name', sequenceNameFor: '1', position: null },
      ]) });
    viewer.view.actions.clearAll();
    viewer.view.actions.loadAllUrlParameters(params);
    await viewer.flush();
    expect(viewer.api.getSequenceNames()).toEqual({ seq1name: 'Explicit α & β', seq2name: 'Other RNA' });
    expect(viewer.api.getTextAnnotations()[0].text).toBe('Explicit α & β');
    expect(document.getElementById('seq1name').value).toBe('Explicit α & β');
    const shared = new URL(viewer.view.actions.generateShareableURL()).searchParams;
    expect(shared.get('seq1name')).toBe('Explicit α & β');
    expect(shared.get('seq2name')).toBe('Other RNA');
    expect(JSON.parse(shared.get('textAnnotations'))[0].sequenceNameFor).toBe('1');
    viewer.view.actions.clearAll();
    expect(viewer.api.getSequenceNames()).toEqual({ seq1name: 'Seq. 1', seq2name: 'Seq. 2' });
    expect(viewer.api.getTextAnnotations()).toEqual([]);
  } finally { await viewer.close(); }
});

test('a retained name for an absent strand is identified and cannot start a list drag', async () => {
  const viewer = await mountViewer();
  try {
    const annotation = viewer.api.registerTextAnnotation({ text: 'Second RNA', sequenceNameFor: '2' });
    viewer.view.state.fields.sequence = 'ACGU';
    viewer.view.actions.syncAnnotations();
    await viewer.flush();
    const row = document.querySelector('[data-sequence-name-for="2"]');
    expect(row.querySelector('.text-annotation-status').getAttribute('aria-label')).toBe('Sequence absent');
    expect(row.querySelector('.text-annotation-preview').draggable).toBe(false);
    const event = { preventDefault: jest.fn(), dataTransfer: { setData: jest.fn() } };
    viewer.view.actions.startTextAnnotationDrag(annotation, event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.dataTransfer.setData).not.toHaveBeenCalled();
  } finally { await viewer.close(); }
});
