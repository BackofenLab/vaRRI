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
    expect(document.getElementById('fastaSeqName1').value).toBe('OxyS');
    expect(document.getElementById('fastaSeqName2').value).toBe('fhlA');
    expect(document.getElementById('fastaSeqName1').style.backgroundColor).toMatch(/^rgba?\(/);
    input('fastaSeqName1', 'Edited RNA α');
    input('fastaSeqName2', 'Custom target');
    expect(viewer.view.actions.validateFastaForm()).toBe(true);
    expect(document.getElementById('fastaSeqName1').value).toBe('Edited RNA α');
    viewer.renderSpy.mockClear();
    expect(viewer.view.actions.submitFastaForm()).toBe(true);
    await viewer.flush();
    expect(viewer.api.getSequenceNames()).toEqual({ seqName1: 'Edited RNA α', seqName2: 'Custom target' });
    expect(viewer.view.state.fields).toMatchObject({ sequence: 'ACGU&UGCA', structure: '((..&..))',
      seqName1: 'Edited RNA α', seqName2: 'Custom target', fastaInput: '' });
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
    input('fastaSeqName1', 'Unsaved');
    input('fastaInput', '>replacement\nACGU');
    await viewer.flush();
    expect(document.getElementById('fastaSeqName1').value).toBe('replacement');
    expect(document.getElementById('fastaSeqName2')).toBeNull();
    expect(viewer.view.state.fields.fastaStructure).toBe('');
    document.querySelector('#fastaDialog button[value="cancel"]').click();
    await viewer.flush();
    expect(viewer.api.getSequenceNames()).toEqual(original);
    expect(viewer.view.state.fields.fastaInput).toBe('');
    document.getElementById('fastaInputBtn').click();
    await viewer.flush();
    input('fastaInput', '>replacement\nACGU');
    await viewer.flush();
    expect(document.getElementById('fastaSeqName1').value).toBe('replacement');
  } finally { await viewer.close(); }
});

test('clearing the viewer invalidates cached FASTA names before parsing the same source again', async () => {
  const viewer = await mountViewer();
  try {
    const source = '>OxyS description\nACGU\n((..\n>fhlA description\nUGCA\n..))';
    input('fastaInput', source);
    await viewer.flush();
    expect(viewer.view.state.fields.fastaSeqName1).toBe('OxyS');
    viewer.view.actions.clearAll();
    expect(viewer.view.state.fields.fastaSeqName1).toBe('Seq. 1');
    input('fastaInput', source);
    await viewer.flush();
    expect(viewer.view.state.fields.fastaSeqName1).toBe('OxyS');
    expect(viewer.view.state.fields.fastaSeqName2).toBe('fhlA');
  } finally { await viewer.close(); }
});
