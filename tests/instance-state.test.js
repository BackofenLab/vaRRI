import { createVaRRI } from '../src/core/index.js';

test('instances own their colors and annotation registries', () => {
  const first = createVaRRI();
  const second = createVaRRI();
  first.setColors({ sequence1: '#123456' });
  expect(first.getColors().sequence1).toBe('#123456');
  expect(second.getColors().sequence1).toBe('lightblue');
  first.registerSubsequenceHighlight({ sequence: '1', range: '1-2', color: '#123456' });
  expect(first.getSubsequenceHighlights()).toHaveLength(1);
  expect(second.getSubsequenceHighlights()).toEqual([]);
  second.registerSubsequenceHighlight({ sequence: '2', range: '3-4', color: '#abcdef' });
  first.clearSubsequenceHighlights();
  expect(first.getSubsequenceHighlights()).toEqual([]);
  expect(second.getSubsequenceHighlights()).toHaveLength(1);
});

test('biological numbering stays independent of contiguous internal IDs', () => {
  const api = createVaRRI();
  const validated = api.validate({ sequence: 'ACGU&UGCA', structure: '((..&..))', startIndex1: '-2', startIndex2: '10' });
  expect(validated.sequence).toBe('ACGU&UGCA');
  expect(api.getIndexDictionary(validated)).toEqual({
    1: ['s1', -2], 2: ['s1', -1], 3: ['s1', 1], 4: ['s1', 2],
    5: ['s2', 10], 6: ['s2', 11], 7: ['s2', 12], 8: ['s2', 13],
  });
});
