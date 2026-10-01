import { mountViewer } from './helpers/vue-viewer.js';

function input(id, value) {
  const field = document.getElementById(id);
  field.value = value;
  field.dispatchEvent(new window.Event('input', { bubbles: true }));
}

test('FASTA exposes first header tokens as editable names and preserves edits through validation and submission', async () => {
  const viewer = await mountViewer();
  try {
    viewer.view.actions.clearAll();
    document.getElementById('fastaInputBtn').click();
    await viewer.flush();
    input('fastaInput', '>OxyS description with spaces\nACGU\n((..\n>fhlA second description\nUGCA\n..))');
    await viewer.flush();
    expect(document.getElementById('fastaSeq1name').value).toBe('OxyS');
    expect(document.getElementById('fastaSeq2name').value).toBe('fhlA');
    expect(document.getElementById('fastaSeq1name').style.backgroundColor).toMatch(/^rgba?\(/);
    input('fastaSeq1name', 'Edited RNA α');
    input('fastaSeq2name', 'Custom target');
    expect(viewer.view.actions.validateFastaForm()).toBe(true);
    expect(document.getElementById('fastaSeq1name').value).toBe('Edited RNA α');
    viewer.renderSpy.mockClear();
    expect(viewer.view.actions.submitFastaForm()).toBe(true);
    await viewer.flush();
    expect(viewer.api.getSequenceNames()).toEqual({ seq1name: 'Edited RNA α', seq2name: 'Custom target' });
    expect(viewer.view.state.fields).toMatchObject({ sequence: 'ACGU&UGCA', structure: '((..&..))',
      seq1name: 'Edited RNA α', seq2name: 'Custom target', fastaInput: '' });
    expect(viewer.renderSpy).toHaveBeenCalledTimes(1);
    const params = new URL(viewer.view.actions.generateShareableURL()).searchParams;
    expect([...params.keys()].some(key => key.startsWith('fasta'))).toBe(false);
  } finally { await viewer.close(); }
});

test('changed FASTA source resets derived names while cancelling drafts leaves model names unchanged', async () => {
  const viewer = await mountViewer();
  try {
    const original = viewer.api.getSequenceNames();
    document.getElementById('fastaInputBtn').click();
    await viewer.flush();
    input('fastaInput', '>first description\nACGU\n....');
    await viewer.flush();
    input('fastaSeq1name', 'Unsaved');
    input('fastaInput', '>replacement\nACGU');
    await viewer.flush();
    expect(document.getElementById('fastaSeq1name').value).toBe('replacement');
    expect(document.getElementById('fastaSeq2name')).toBeNull();
    expect(viewer.view.state.fields.fastaStructure).toBe('');
    document.querySelector('#fastaDialog button[value="cancel"]').click();
    await viewer.flush();
    expect(viewer.api.getSequenceNames()).toEqual(original);
    expect(viewer.view.state.fields.fastaInput).toBe('');
    document.getElementById('fastaInputBtn').click();
    await viewer.flush();
    input('fastaInput', '>replacement\nACGU');
    await viewer.flush();
    expect(document.getElementById('fastaSeq1name').value).toBe('replacement');
  } finally { await viewer.close(); }
});

test('clearing the viewer invalidates cached FASTA names before parsing the same source again', async () => {
  const viewer = await mountViewer();
  try {
    const source = '>OxyS description\nACGU\n((..\n>fhlA description\nUGCA\n..))';
    input('fastaInput', source);
    await viewer.flush();
    expect(viewer.view.state.fields.fastaSeq1name).toBe('OxyS');
    viewer.view.actions.clearAll();
    expect(viewer.view.state.fields.fastaSeq1name).toBe('Seq. 1');
    input('fastaInput', source);
    await viewer.flush();
    expect(viewer.view.state.fields.fastaSeq1name).toBe('OxyS');
    expect(viewer.view.state.fields.fastaSeq2name).toBe('fhlA');
  } finally { await viewer.close(); }
});
