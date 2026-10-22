import { mountViewer } from './helpers/vue-viewer.js';

function markedOffsets(id, className) {
  let offset = 0;
  const marked = [];
  for (const span of document.querySelectorAll(`#highlights-${id} span`)) {
    if (span.classList.contains(className)) marked.push(offset);
    offset += span.textContent.length;
  }
  return marked;
}

function expectMarks(id, caret, partner) {
  expect(markedOffsets(id, 'hl-caret')).toEqual(caret);
  expect(markedOffsets(id, 'hl-partner')).toEqual(partner);
}

async function fixture(sequence = 'ACGU&UGCA', structure = '([..&.)].') {
  const viewer = await mountViewer({ url: 'http://localhost/?' + new URLSearchParams({ sequence, structure }) });
  const move = async (id, start, end = start, event = 'keyup') => {
    const input = document.getElementById(id);
    input.focus();
    input.setSelectionRange(start, end);
    input.dispatchEvent(new window.Event(event));
    await viewer.flush();
  };
  const edit = async (id, value, caret = value.length) => {
    const input = document.getElementById(id);
    input.focus();
    input.value = value;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await viewer.flush();
  };
  return { ...viewer, move, edit };
}

test('links both inputs and crossing base pairs from either editing field', async () => {
  const { move, renderSpy, close } = await fixture();
  try {
    const renders = renderSpy.mock.calls.length;
    await move('sequence', 1);
    for (const id of ['sequence', 'structure']) expectMarks(id, [0], [6]);
    await move('sequence', 2, 2, 'click');
    for (const id of ['sequence', 'structure']) expectMarks(id, [1], [7]);
    await move('structure', 7, 7, 'selectionchange');
    for (const id of ['sequence', 'structure']) expectMarks(id, [6], [0]);
    await move('structure', 4);
    for (const id of ['sequence', 'structure']) expectMarks(id, [3], []);
    expect(renderSpy.mock.calls.length).toBe(renders);
  } finally { await close(); }
});

test('matches every bracket type in a nested structure across the strand separator', async () => {
  const { move, close } = await fixture('ACGU&UGCA', '<{[(&)]}>');
  try {
    for (const [open, end] of [[0, 8], [1, 7], [2, 6], [3, 5]]) {
      await move('structure', open + 1);
      for (const id of ['sequence', 'structure']) expectMarks(id, [open], [end]);
      await move('sequence', end + 1);
      for (const id of ['sequence', 'structure']) expectMarks(id, [end], [open]);
    }
    await move('sequence', 5);
    for (const id of ['sequence', 'structure']) expectMarks(id, [4], []);
  } finally { await close(); }
});

test('updates immediately during incomplete edits and never invents unmatched partners', async () => {
  const { move, edit, close } = await fixture();
  try {
    await edit('structure', '((..&..)', 1);
    for (const id of ['sequence', 'structure']) expectMarks(id, [0], []);
    await move('structure', 8);
    for (const id of ['sequence', 'structure']) expectMarks(id, [7], [1]);
    await edit('structure', '((..&..))');
    for (const id of ['sequence', 'structure']) expectMarks(id, [8], [0]);
    await edit('structure', ')...&....', 1);
    for (const id of ['sequence', 'structure']) expectMarks(id, [0], []);
  } finally { await close(); }
});

test('skips only missing positions when lengths differ or a field is empty', async () => {
  const { move, edit, close } = await fixture('ACG', '((..))');
  try {
    await move('sequence', 1);
    expectMarks('sequence', [0], []);
    expectMarks('structure', [0], [5]);
    await move('structure', 6);
    expectMarks('sequence', [], [0]);
    expectMarks('structure', [5], [0]);
    await edit('sequence', 'ACGUACGU');
    expectMarks('sequence', [7], []);
    expectMarks('structure', [], []);
    await edit('structure', '');
    for (const id of ['sequence', 'structure']) expectMarks(id, [], []);
    await move('sequence', 2);
    expectMarks('sequence', [1], []);
    expectMarks('structure', [], []);
  } finally { await close(); }
});

test('clears on selections, the start of input, blur, Clear, and example replacement', async () => {
  const { move, view, flush, close } = await fixture();
  try {
    for (const action of [
      () => move('sequence', 0),
      () => move('sequence', 1, 4, 'select'),
      () => document.getElementById('startIndex1').focus(),
      () => view.actions.clearAll(),
      () => view.actions.loadExample('2mol'),
    ]) {
      view.state.fields.sequence = 'ACGU&UGCA';
      view.state.fields.structure = '([..&.)].';
      await flush();
      await move('sequence', 2);
      expectMarks('sequence', [1], [7]);
      await action();
      await flush();
      for (const id of ['sequence', 'structure']) expectMarks(id, [], []);
    }
  } finally { await close(); }
});

test('preserves raw text, strand colors, and FASTA previews while highlighting', async () => {
  const { move, view, flush, close } = await fixture('A\nCG&UA\n', '(\n..&.)\n');
  try {
    view.state.fields.fastaSequence = 'AC&GU';
    view.state.fields.fastaStructure = '(.&.)';
    await flush();
    const strandColor = document.querySelector('#highlights-sequence .hl-seq1').style.backgroundColor;
    await move('sequence', 1);
    for (const id of ['sequence', 'structure']) {
      expectMarks(id, [0], [6]);
      expect(document.getElementById(`highlights-${id}`).textContent).toBe(view.state.fields[id] + ' ');
    }
    for (const id of ['fastaSequence', 'fastaStructure']) {
      expectMarks(id, [], []);
      expect(document.getElementById(`highlights-${id}`).textContent).toBe(view.state.fields[id]);
    }
    await move('sequence', 0);
    expect(document.querySelector('#highlights-sequence .hl-seq1').style.backgroundColor).toBe(strandColor);
  } finally { await close(); }
});
