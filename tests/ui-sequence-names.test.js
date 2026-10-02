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
    const names = document.querySelector('fieldset.sequence-names');
    expect(names.querySelector('legend').textContent).toBe('Sequence Names');
    expect(names.querySelectorAll('label')).toHaveLength(0);
    expect(document.getElementById('seqName1').getAttribute('aria-label')).toBe('Sequence 1 name');
    expect(document.getElementById('seqName2').getAttribute('aria-label')).toBe('Sequence 2 name');
    const annotation = viewer.api.registerTextAnnotation({ text: 'Seq. 1', sequenceNameFor: '1',
      size: 6.4, position: { x: 12, y: 34 } });
    viewer.view.actions.syncAnnotations();
    await viewer.flush();
    viewer.renderSpy.mockClear();
    const refresh = jest.spyOn(viewer.api, 'refreshTextAnnotations');
    changeField('seqName1', 'RNA alpha');
    await viewer.flush();
    expect(viewer.api.getSequenceNames().seqName1).toBe('RNA alpha');
    expect(viewer.api.getTextAnnotations()[0]).toMatchObject({ id: annotation.id,
      text: 'RNA alpha', position: { x: 12, y: 34 }, size: 6.4 });
    const row = document.querySelector('[data-sequence-name-for="1"]');
    expect(row.querySelector('.text-annotation-kind').textContent).toBe('Sequence 1 name');
    expect(document.getElementById('seqName1').style.backgroundColor).not.toBe('');
    expect(document.getElementById('seqName1').style.backgroundColor)
      .not.toBe(document.getElementById('seqName2').style.backgroundColor);
    row.querySelector('.text-annotation-preview').click();
    await viewer.flush();
    expect(document.querySelector('#textAnnotationDialog .dialog-header').textContent).toContain('Sequence 1 Name');
    changeField('textAnnotationText', 'RNA renamed in dialog');
    document.querySelector('#textAnnotationDialog button[value="ok"]').click();
    await viewer.flush();
    expect(document.getElementById('seqName1').value).toBe('RNA renamed in dialog');
    expect(viewer.api.getSequenceNames().seqName1).toBe('RNA renamed in dialog');
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
    changeField('seqName1', '  ');
    await viewer.flush();
    expect(document.getElementById('seqName1').value).toBe('Seq. 1');
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
    expect(document.getElementById('seqName1').value).toBe('RNA alpha');
  } finally { await viewer.close(); }
});

test.each([
  { seqName1: 'Explicit α & β', seqName2: 'Other RNA' },
])('sequence name URL fields override label text and survive shared links: %j', async nameFields => {
  const viewer = await mountViewer();
  try {
    const params = new URLSearchParams({ sequence: 'ACGU&UGCA', structure: '((..&..))',
      ...nameFields, textAnnotations: JSON.stringify([
        { text: 'Outdated name', sequenceNameFor: '1', position: null },
      ]) });
    viewer.view.actions.clearAll();
    viewer.view.actions.loadAllUrlParameters(params);
    await viewer.flush();
    expect(viewer.api.getSequenceNames()).toEqual({ seqName1: 'Explicit α & β', seqName2: 'Other RNA' });
    expect(viewer.api.getTextAnnotations()[0].text).toBe('Explicit α & β');
    expect(document.getElementById('seqName1').value).toBe('Explicit α & β');
    const shared = new URL(viewer.view.actions.generateShareableURL()).searchParams;
    expect(shared.get('seqName1')).toBe('Explicit α & β');
    expect(shared.get('seqName2')).toBe('Other RNA');
    expect(JSON.parse(shared.get('textAnnotations'))[0].sequenceNameFor).toBe('1');
    viewer.view.actions.clearAll();
    expect(viewer.api.getSequenceNames()).toEqual({ seqName1: 'Seq. 1', seqName2: 'Seq. 2' });
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
