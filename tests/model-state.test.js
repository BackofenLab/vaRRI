import { createModelState } from '../src/core/model/index.js';
import { setColors, getColors } from '../src/core/model/colors.js';
import { registerSubsequenceHighlight, getSubsequenceHighlights } from '../src/core/model/subsequences.js';
import { registerRegionHighlight, getRegionHighlights, clearGeneratedRegionHighlights } from '../src/core/model/regions.js';
import { registerPointMutation, getPointMutations, updatePointMutation } from '../src/core/model/mutations.js';
import { createSession } from '../src/core/session.js';
import { createVaRRI } from '../src/core/index.js';

const sequenceContext = {
  '1': { offset: -2, length: 4, sequence: 'ACGU' },
  '2': { offset: 10, length: 4, sequence: 'UGCA' },
};

test('serialized model state can resume annotation edits and ID allocation without a renderer', () => {
  const state = createModelState();
  setColors(state, { sequence1: '#123456' });
  registerSubsequenceHighlight(state, { sequence: '1', range: '-2--1' }, sequenceContext);
  const region = { sequence1Range: [-2, -1], sequence2Range: [10, 11] };
  registerRegionHighlight(state, region, sequenceContext);
  registerRegionHighlight(state, { ...region, generated: true }, sequenceContext);
  registerPointMutation(state, { sequence: '1', position: -1, replacement: 'A' }, sequenceContext);

  const restored = JSON.parse(JSON.stringify(state));
  expect(restored).toEqual(state);
  expect(getColors(restored).sequence1).toBe('#123456');
  const next = registerSubsequenceHighlight(restored, { sequence: '2', range: '12-13' }, sequenceContext);
  expect(next.id).toBe(2);
  updatePointMutation(restored, 1, { replacement: 'G' }, sequenceContext);
  expect(getPointMutations(restored)[0].replacement).toBe('G');
  clearGeneratedRegionHighlights(restored);
  expect(getRegionHighlights(restored)).toHaveLength(1);
  expect(getRegionHighlights(restored)[0].generated).toBe(false);

  expect(getSubsequenceHighlights(state)).toHaveLength(1);
  expect(getPointMutations(state)[0].replacement).toBe('A');
  expect(getRegionHighlights(state)).toHaveLength(2);
});

test('renderer documents and cyclic force graphs cannot enter the serializable model state', () => {
  const document = { title: 'Rendering document' };
  document.ownerDocument = document;
  const session = createSession({ document });
  const graph = { nodes: [] };
  graph.nodes.push({ rna: graph });
  session.runtime.activeContainer = { graph };
  registerSubsequenceHighlight(session.modelState, { sequence: '1', range: '1-2' });

  const serialized = JSON.parse(JSON.stringify(session.modelState));
  expect(getSubsequenceHighlights(serialized)[0].range).toEqual([[1, 2]]);
  expect(Object.keys(serialized).sort()).toEqual(['annotations', 'colors']);
  expect(() => JSON.stringify(session)).toThrow();
});

test('public model operations never resolve document or canvas dependencies', () => {
  const api = createVaRRI({
    get document() { throw new Error('A model operation requested the DOM'); },
    createCanvas() { throw new Error('A model operation requested the renderer'); },
  });
  api.setColors({ sequence1: '#abcdef' });
  api.registerSubsequenceHighlight({ sequence: '1', range: '-2--1' }, sequenceContext);
  const validated = api.validate({ sequence: 'ACGU&UGCA', structure: '((..&..))',
    startIndex1: '-2', startIndex2: '10', subsequenceHighlights: api.getSubsequenceHighlights() });
  expect(JSON.parse(JSON.stringify(validated)).subsequenceHighlights[0].range).toEqual([[-2, -1]]);
  expect(api.sequenceColoring('AC', '')).toEqual(['#abcdef', '#abcdef']);
  api.clearSubsequenceHighlights();
  expect(api.getSubsequenceHighlights()).toEqual([]);
});
