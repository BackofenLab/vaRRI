import { mountViewer } from './helpers/vue-viewer.js';

test('a sequence edit after dismissal validates even before the FASTA close event arrives', async () => {
  const viewer = await mountViewer();
  try {
    document.getElementById('fastaInputBtn').click();
    await viewer.flush();
    // Native dialogs clear open synchronously and queue their close event.
    const dialog = document.getElementById('fastaDialog');
    dialog.open = false;
    const sequence = document.getElementById('sequence');
    sequence.value = '>missing sequence';
    sequence.dispatchEvent(new window.Event('input', { bubbles: true }));
    sequence.dispatchEvent(new window.Event('change', { bubbles: true }));
    dialog.dispatchEvent(new window.Event('close'));
    await viewer.flush();

    expect(document.querySelector('#sequence ~ .field-tooltip').textContent).toMatch(/IUPAC/);
  } finally { await viewer.close(); }
});

test('a committed wrapped FASTA record opens as a draft without changing the current structure or names', async () => {
  const viewer = await mountViewer();
  try {
    const sequence = document.getElementById('sequence');
    const structure = document.getElementById('structure').value;
    const names = viewer.api.getSequenceNames();
    const source = '# comment\n>wrapped description\nAC G\nU\n';
    sequence.value = source;
    sequence.dispatchEvent(new window.Event('change', { bubbles: true }));
    await viewer.flush();

    expect(document.getElementById('fastaDialog').open).toBe(true);
    expect(sequence.value).toBe('');
    expect(document.getElementById('fastaInput').value).toBe(source);
    expect(document.getElementById('fastaSequence').value).toBe('ACGU');
    expect(document.getElementById('fastaStructure').value).toBe('');
    document.querySelector('#fastaDialog button[value="cancel"]').click();
    await viewer.flush();
    expect(document.getElementById('structure').value).toBe(structure);
    expect(viewer.api.getSequenceNames()).toEqual(names);
    expect(sequence.value).toBe('');
  } finally { await viewer.close(); }
});

test('a parseable FASTA paste into an empty sequence field shows structure errors in the dialog', async () => {
  const viewer = await mountViewer();
  try {
    viewer.view.actions.clearAll();
    await viewer.flush();
    const sequence = document.getElementById('sequence');
    sequence.value = '>first\nACGU\n...';
    sequence.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
    await viewer.flush();

    expect(sequence.value).toBe('');
    expect(document.getElementById('fastaDialog').open).toBe(true);
    expect(document.querySelector('#fastaStructure ~ .field-tooltip').textContent).toMatch(/length/i);
    document.querySelector('#fastaDialog button[value="ok"]').click();
    await viewer.flush();
    expect(document.getElementById('fastaDialog').open).toBe(true);
    expect(document.getElementById('structure').value).toBe('');
  } finally { await viewer.close(); }
});
