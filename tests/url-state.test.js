import { decodeUrlState, encodeUrlState, validate } from '../src/core/model/index.js';

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
