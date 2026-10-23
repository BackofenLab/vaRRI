import { createVaRRI, decodeJsonState, encodeJsonState } from '../src/core/index.js';
import * as model from '../src/core/model/index.js';

const session = {
  fields: { sequence: 'ACGU&UGCA', structure: '((..&..))', startIndex1: '-2', startIndex2: '100',
    seqName1: 'α & <strand>', profileData1: '# probabilities\n-2 0.2\n-1 0.8', profileIdxRef1: 'start',
    forceLayout: false, distinctBpTypes: true, colorSeq1: '#123456', fastaInput: 'draft', rotationSlider: '20' },
  rotation: -35, showRenderingOnly: true,
  annotations: {
    pointMutations: [{ id: 7, sequence: '1', position: -1, replacement: 'G', color: 'green' }],
    subsequenceHighlights: [{ sequence: '1', range: [[-2, -1], [1, 2]], color: 'rgba(1,2,3,0.5)', alpha: 0.7 }],
    regionHighlights: [{ sequence1Range: [-2, -1], sequence2Range: [100, 101], color: '#fedcba', alpha: 0.2 },
      { generated: true }],
    textAnnotations: [{ text: 'α: "a & b"\n<note>', bold: true, italic: true, size: 19,
      color: 'navy', position: { x: -12, y: 8 } }],
  },
};

test('JSON preserves editable fields, biological ranges and text styles without URL escaping or runtime data', () => {
  const json = encodeJsonState(session);
  const data = JSON.parse(json);
  expect(data).toMatchObject({ format: 'vaRRI', version: 1, rotation: -35, showRenderingOnly: true });
  expect(data.fields).not.toHaveProperty('fastaInput');
  expect(data.fields).not.toHaveProperty('rotationSlider');
  expect(data.fields.profileData1).toBe(session.fields.profileData1);
  expect(data.fields.forceLayout).toBe(false);
  expect(data.annotations.regionHighlights).toHaveLength(1);
  expect(data.annotations.pointMutations[0]).toEqual({ sequence: '1', position: -1, replacement: 'G', color: 'green' });
  expect(data.annotations.subsequenceHighlights[0].range).toEqual([[-2, -1], [1, 2]]);
  expect(data.annotations.textAnnotations[0]).toMatchObject(session.annotations.textAnnotations[0]);
  expect(encodeJsonState(decodeJsonState(json))).toBe(json);
  expect(json).toContain('\n  "fields": {');
});

test('codecs are available headlessly from instances and the model entry', () => {
  expect(createVaRRI().decodeJsonState(encodeJsonState(session))).toEqual(model.decodeJsonState(model.encodeJsonState(session)));
});

test.each(['#abc', '#abcd', '#abcdef', '#abcdef80'])('preserves hex colors accepted by shared links: %s', colorSeq1 => {
  expect(decodeJsonState(encodeJsonState({ fields: { colorSeq1 } })).fields.colorSeq1).toBe(colorSeq1);
});

test('partial files use defaults and accept numeric indices, BOM and explicit empty labels', () => {
  const data = { format: 'vaRRI', version: 1, fields: { startIndex1: -3 }, annotations: { textAnnotations: [] } };
  expect(decodeJsonState('\uFEFF' + JSON.stringify(data))).toEqual({ fields: { startIndex1: '-3' },
    annotations: { textAnnotations: [] }, rotation: 0, showRenderingOnly: false });
  expect(decodeJsonState({ ...data, annotations: {} }).annotations).not.toHaveProperty('textAnnotations');
});

test.each([
  ['{broken', /valid JSON/], ['null', /object/], ['[]', /object/],
  [{ format: 'other', version: 1, fields: {} }, /vaRRI/],
  [{ format: 'vaRRI', version: 2, fields: {} }, /version/],
  [{ fields: [] }, /fields/], [{ fields: { forceLayout: 'false' } }, /true or false/],
  [{ fields: { sequence: {} } }, /string/], [{ fields: { coloring: 'invalid' } }, /one of/],
  [{ fields: { colorSeq1: 'red' } }, /hex color/], [{ fields: { unknown: 'x' } }, /Unknown/],
  [{ rotation: null }, /finite/], [{ showRenderingOnly: 'false' }, /true or false/],
  [{ annotations: [] }, /object/], [{ annotations: { unknown: [] } }, /Unknown/],
  [{ annotations: { pointMutations: {} } }, /array/],
  [{ annotations: { pointMutations: [{ sequence: 1, position: 0, replacement: 'G' }] } }, /pointMutations/],
  [{ annotations: { subsequenceHighlights: [{ sequence: 1, range: [[1, 2]], alpha: 3 }] } }, /alpha/],
  [{ annotations: { textAnnotations: [{ text: 'label', position: { x: null, y: 2 } }] } }, /coordinates/],
])('rejects malformed session data: %j', (input, message) => {
  const data = typeof input === 'string' ? input : { format: 'vaRRI', version: 1, fields: {}, ...input };
  expect(() => decodeJsonState(data)).toThrow(message);
});

test('unexpected prototype keys are rejected without altering object prototypes', () => {
  expect(() => decodeJsonState('{"format":"vaRRI","version":1,"fields":{"__proto__":{"polluted":true}}}')).toThrow(/Unknown/);
  expect({}.polluted).toBeUndefined();
});
