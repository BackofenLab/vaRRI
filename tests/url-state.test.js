import { createSubsequenceHighlight, createRegionHighlight, createPointMutation,
  decodeUrlState, encodeUrlState, validate } from '../src/core/model/index.js';

describe('DOM-free legacy URL state', () => {
  test('preserves repeated ordinary fields in order and legacy checkbox values', () => {
    const state = decodeUrlState('?sequence=AAAA&sequence=UUUU&forceLayout=on&forceLayout=0&distinctBpTypes=true');
    expect(state.fields.sequence).toEqual(['AAAA', 'UUUU']);
    expect(state.fields.forceLayout).toEqual([true, false]);
    expect(state.fields.distinctBpTypes).toBe(true);
    const encoded = encodeUrlState(state);
    expect(encoded.getAll('sequence')).toEqual(['AAAA', 'UUUU']);
    expect(encoded.getAll('forceLayout')).toEqual(['1', '0']);
  });

  test('uses the first annotation and rotation occurrence', () => {
    const state = decodeUrlState('?mutations=1:-2G:abc&mutations=2:10A:fff&rotation=30&rotation=90');
    expect(state.annotations.pointMutations).toEqual([
      { sequence: '1', position: -2, replacement: 'G', color: '#ABC' },
    ]);
    expect(state.rotation).toBe(30);
  });

  test('round-trips signed ranges, annotation style, multiline profiles and rendering-only mode', () => {
    const source = new URLSearchParams({
      sequence: 'ACGU&UGCA', structure: '((..&..))', startIndex1: '-2', startIndex2: '10',
      profileData1: '-2 0.5\n-1 0.7', profileColorRepresentsOne1: '1',
      subseqHighlights: ' 1:-2--1:abc:0.3 ,2:10-11:123456:0.4 ',
      regionHighlights: '-2-2&10-13:ff0000:0.2', mutations: '1:-1G:123456',
      rotation: '-45', showRenderingOnly: '',
    });
    const decoded = decodeUrlState(source);
    expect(decoded.annotations.subsequenceHighlights.map(item => item.range)).toEqual([[[-2, -1]], [[10, 11]]]);
    expect(decoded.annotations.regionHighlights[0]).toMatchObject({
      sequence1Range: [-2, 2], sequence2Range: [10, 13], alpha: 0.2,
    });
    expect(decoded.showRenderingOnly).toBe(true);
    const reloaded = decodeUrlState(encodeUrlState(decoded));
    expect(reloaded).toEqual(decoded);
    expect(validate(decoded.fields).sequence).toBe('ACGU&UGCA');
  });

  test('hex colors normalize and invalid color input falls back to the previous value', () => {
    const decoded = decodeUrlState('colorSeq1=abc&colorSeq1=rgba(0,0,0,1)&colorSeq2=bad-color');
    expect(decoded.fields.colorSeq1).toEqual(['#ABC', '#ABC']);
    expect(decoded.fields.colorSeq2).toBe('#F4BB44');
  });

  test('one multi-range highlight retains its grouping, signed coordinates and style', () => {
    const grouped = createSubsequenceHighlight({ sequence: '1', range: '-3--2,1-2,4-5', color: '#123456', alpha: 0.6 });
    const other = createSubsequenceHighlight({ sequence: '2', range: '10-11', color: '#ABCDEF', alpha: 0.4 });
    const encoded = encodeUrlState({ annotations: { subsequenceHighlights: [grouped, other] } });
    const restored = decodeUrlState(encoded).annotations.subsequenceHighlights;
    expect(encoded.get('subseqHighlights')).toBe('1:-3--2,1-2,4-5:123456:0.6,2:10-11:ABCDEF:0.4');
    expect(restored).toHaveLength(2);
    expect(restored[0]).toEqual({ sequence: '1', range: [[-3, -2], [1, 2], [4, 5]],
      rangeText: '-3--2,1-2,4-5', color: '#123456', alpha: 0.6 });
    expect(restored[1]).toMatchObject({ sequence: '2', range: [[10, 11]], color: '#ABCDEF', alpha: 0.4 });
  });

  test.each([
    { range: [[1, 2], [4, 5]] },
    { range: '1-2,4-5' },
    { rangeText: '1-2,4-5' },
  ])('multi-range DTO forms preserve one annotation: %j', range => {
    const encoded = encodeUrlState({ annotations: { subsequenceHighlights: [
      { sequence: '1', color: '#123456', alpha: 0.6, ...range },
    ] } });
    expect(decodeUrlState(encoded).annotations.subsequenceHighlights).toEqual([
      { sequence: '1', range: [[1, 2], [4, 5]], rangeText: '1-2,4-5', color: '#123456', alpha: 0.6 },
    ]);
  });

  test.each(['red', 'RebeccaPurple', 'rgb(10, 20, 30)', 'hsl(120 50% 40% / 0.5)',
    'color(display-p3 0.1 0.2 0.3)', 'var(--rna-color, red)'])(
    'annotation model CSS strings round-trip as explicit data tokens: %s', color => {
      const annotations = {
        pointMutations: [createPointMutation({ sequence: '1', position: 1, replacement: 'G', color })],
        subsequenceHighlights: [createSubsequenceHighlight({ sequence: '1', range: '1-2,4-5', color, alpha: 0.6 })],
        regionHighlights: [createRegionHighlight({ sequence1Range: [1, 2], sequence2Range: [3, 4], color, alpha: 0.2 })],
      };
      const encoded = encodeUrlState(JSON.parse(JSON.stringify({ annotations })));
      for (const key of ['mutations', 'subseqHighlights', 'regionHighlights']) {
        expect(encoded.get(key)).toContain('css~' + encodeURIComponent(color));
      }
      const restored = decodeUrlState(encoded).annotations;
      for (const key of Object.keys(annotations)) {
        expect(restored[key]).toHaveLength(1);
        expect(restored[key][0].color).toBe(color);
      }
      expect(restored.subsequenceHighlights[0].range).toEqual([[1, 2], [4, 5]]);
    }
  );

  test.each(['range', 'rangeText'])('single positions in %s retain their neighboring ranges', key => {
    const encoded = encodeUrlState({ annotations: { subsequenceHighlights: [
      { sequence: '1', [key]: '-3,1-2', color: '#123456', alpha: 0.6 },
    ] } });
    const restored = decodeUrlState(encoded).annotations.subsequenceHighlights;
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ range: [[-3, -3], [1, 2]], color: '#123456', alpha: 0.6 });
  });

  test('encoded CSS tags are case insensitive without changing ordinary color fields', () => {
    const restored = decodeUrlState(new URLSearchParams({
      mutations: '1:1G:CSS~red', colorSeq1: 'css~red', colorSeq2: 'red',
    }));
    expect(restored.annotations.pointMutations[0].color).toBe('red');
    expect(restored.fields).toEqual({ colorSeq1: '#ADD8E6', colorSeq2: '#F4BB44' });
  });

  test.each(['css~', 'css~%', 'css~%E0%A4%A', 'css~%00red', 'css~red%7F', 'css~red%0A',
    'css~red%C2%85', 'css~%20', 'red', 'rgba(0,0,0,1)'])(
    'malformed tagged or legacy raw colors do not corrupt valid neighbors: %s', invalid => {
      const restored = decodeUrlState(new URLSearchParams({
        mutations: `1:1G:${invalid},2:10A:abc`,
        subseqHighlights: `1:1-2:${invalid}:0.5,2:10-11:abc:0.4`,
        regionHighlights: `1-2&3-4:${invalid}:0.2,5-6&7-8:abc:0.4`,
      })).annotations;
      for (const items of Object.values(restored)) {
        expect(items).toHaveLength(1);
        expect(items[0].color).toBe('#ABC');
      }
    }
  );

  test('malformed range tokens preserve valid legacy neighbors and grouped records', () => {
    const decoded = decodeUrlState(new URLSearchParams({
      subseqHighlights: '1:1-2:abc:0.4,broken,4-5,2:10-11,13-14:123456:0.6,1:7-8:fff:0x5',
    })).annotations.subsequenceHighlights;
    expect(decoded).toEqual([
      { sequence: '1', range: [[1, 2]], rangeText: '1-2', color: '#ABC', alpha: 0.4 },
      { sequence: '2', range: [[10, 11], [13, 14]], rangeText: '10-11,13-14', color: '#123456', alpha: 0.6 },
    ]);
  });

  test('existing single-range and hex annotation encoding stays unchanged', () => {
    const encoded = encodeUrlState({ annotations: {
      pointMutations: [{ sequence: '1', position: -2, replacement: 'G', color: '#abc' }],
      subsequenceHighlights: [{ sequence: '2', range: [[10, 11]], color: '#123456', alpha: 0.4 }],
      regionHighlights: [{ sequence1Range: [-2, 2], sequence2Range: [10, 13], color: '#ff0000', alpha: 0.2 }],
    } });
    expect(Object.fromEntries(encoded)).toEqual({ mutations: '1:-2G:abc',
      subseqHighlights: '2:10-11:123456:0.4', regionHighlights: '-2-2&10-13:ff0000:0.2' });
  });

  test('malformed annotation tokens are ignored without corrupting valid neighbors', () => {
    const decoded = decodeUrlState(new URLSearchParams({
      subseqHighlights: '1:2-3:ff0000:0x5,2:10-11:abcdef:0.5',
      regionHighlights: 'broken,1-2&3-4:ff0000:0.2',
      mutations: 'broken,2:10A:fff',
    }));
    expect(decoded.annotations.subsequenceHighlights).toHaveLength(1);
    expect(decoded.annotations.regionHighlights).toHaveLength(1);
    expect(decoded.annotations.pointMutations).toHaveLength(1);
  });

  test('encoding excludes transient controls and generated regions', () => {
    const parameters = encodeUrlState({
      fields: { sequence: ' AAAA ', fastaInput: 'hidden', rotationSlider: '90', forceLayout: false },
      rotation: 0,
      annotations: { regionHighlights: [
        { rangeText: '1-2&3-4', color: '#123456', alpha: 0.2 },
        { rangeText: '4-5&6-7', color: '#ffffff', generated: true },
      ] },
    });
    expect(parameters.get('sequence')).toBe('AAAA');
    expect(parameters.get('forceLayout')).toBe('0');
    expect(parameters.get('regionHighlights')).toBe('1-2&3-4:123456:0.2');
    for (const field of ['fastaInput', 'rotationSlider', 'rotation']) expect(parameters.has(field)).toBe(false);
  });

  test.each(['false', '0'])('render-only mode is disabled by %s', value => {
    expect(decodeUrlState(`showRenderingOnly=${value}`).showRenderingOnly).toBe(false);
  });
});
