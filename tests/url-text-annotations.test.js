import { createTextAnnotation, decodeUrlState, encodeUrlState } from '../src/core/model/index.js';

describe('text annotation share data', () => {
  test('round-trips literal Unicode, punctuation, styles, free positions and default anchors', () => {
    const definitions = [
      { text: 'α <RNA> & "Seq,2"\nhello:?#%', bold: true, italic: true, size: 21.5,
        color: 'rgb(10, 20, 30)', position: { x: -3.5, y: 8 } },
      { text: 'Seq. 1', position: { x: 1, y: 2 },
        anchor: { sequence: '1', end: 'start', offset: { x: -20, y: 10 } } },
      { text: 'Waiting', position: null },
    ];
    const textAnnotations = definitions.map(createTextAnnotation);
    const params = encodeUrlState({ annotations: { textAnnotations } });
    expect(params.get('textAnnotations')).toBeTruthy();
    const decoded = decodeUrlState(params);
    expect(decoded.fields).not.toHaveProperty('textAnnotations');
    expect(decoded.annotations.textAnnotations).toEqual(textAnnotations.map(({ id, ...item }) => item));
    expect(decodeUrlState(encodeUrlState(decoded))).toEqual(decoded);
  });

  test('distinguishes legacy links from explicit cleared annotations', () => {
    expect(decodeUrlState('sequence=ACGU').annotations).not.toHaveProperty('textAnnotations');
    const params = encodeUrlState({ annotations: { textAnnotations: [] } });
    expect(params.get('textAnnotations')).toBe('[]');
    expect(decodeUrlState(params).annotations.textAnnotations).toEqual([]);
    expect(encodeUrlState({ annotations: {} }).has('textAnnotations')).toBe(false);
  });

  test('uses first occurrence and drops invalid entries without corrupting neighbors', () => {
    const params = new URLSearchParams();
    params.append('textAnnotations', JSON.stringify([
      null, { text: ' ' }, { text: 'Bad position', position: { x: 'x', y: 1 } },
      { text: 'Bad size', size: -1 }, { text: 'Valid', bold: true },
    ]));
    params.append('textAnnotations', JSON.stringify([{ text: 'Wrong occurrence' }]));
    expect(decodeUrlState(params).annotations.textAnnotations).toEqual([
      { text: 'Valid', bold: true, italic: false, size: 16, color: '#000000', position: null, anchor: null },
    ]);
  });

  test.each(['{broken', '{}', 'null', 'false', '"label"'])('malformed JSON is safely empty: %s', value => {
    const decoded = decodeUrlState(new URLSearchParams({ textAnnotations: value, mutations: '1:1G:abc' }));
    expect(decoded.annotations.textAnnotations).toEqual([]);
    expect(decoded.annotations.pointMutations).toHaveLength(1);
  });

  test('does not share unfinished editor controls', () => {
    const fields = { textAnnotationEditId: '3', textAnnotationText: 'Unsaved', textAnnotationBold: true,
      textAnnotationItalic: true, textAnnotationSize: '22', textAnnotationColor: '#123456' };
    expect([...encodeUrlState({ fields })]).toEqual([]);
  });
});
