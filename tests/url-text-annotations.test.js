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
      { text: 'Valid', bold: true, italic: false, size: 16, color: '#000000', position: null, anchor: null, sequenceNameFor: null },
    ]);
  });

  test.each(['{broken', '{}', 'null', 'false', '"label"'])('malformed JSON is safely empty: %s', value => {
    const decoded = decodeUrlState(new URLSearchParams({ textAnnotations: value, mutations: '1:1G:abc' }));
    expect(decoded.annotations.textAnnotations).toEqual([]);
    expect(decoded.annotations.pointMutations).toHaveLength(1);
  });

  test('does not share unfinished editor controls', () => {
    const fields = { textAnnotationEditId: '3', textAnnotationText: 'Unsaved', textAnnotationBold: true,
      textAnnotationItalic: true, textAnnotationSize: '22', textAnnotationColor: '#123456',
      fastaSeqName1: 'Draft 1', fastaSeqName2: 'Draft 2' };
    expect([...encodeUrlState({ fields })]).toEqual([]);
  });

  test('name-label identity survives being moved or unplaced', () => {
    const labels = [{ text: 'RNA α', sequenceNameFor: '1', position: { x: 1, y: 2 }, anchor: null },
      { text: 'RNA β', sequenceNameFor: '2', position: null, anchor: null }];
    const params = encodeUrlState({ fields: { seqName1: 'RNA α', seqName2: 'RNA β' }, annotations: { textAnnotations: labels } });
    const decoded = decodeUrlState(params);
    expect(decoded.fields).toEqual({ seqName1: 'RNA α', seqName2: 'RNA β' });
    expect(decoded.annotations.textAnnotations).toEqual(labels.map(item => expect.objectContaining(item)));
  });

  test.each([
    ['seq1name=Older+RNA&seq2name=Older+target', { seqName1: 'Older RNA', seqName2: 'Older target' }],
    ['seq1name=Old&seqName1=Current&seqName2=Target&seq2name=Old', { seqName1: 'Current', seqName2: 'Target' }],
    ['seqName1=&seq1name=Old&seq2name=First&seq2name=Last', { seqName1: '', seqName2: ['First', 'Last'] }],
  ])('reads legacy name URLs and shares current spellings: %s', (query, fields) => {
    const decoded = decodeUrlState(query);
    expect(decoded.fields).toEqual(fields);
    const shared = encodeUrlState(decoded);
    expect(shared.has('seq1name')).toBe(false);
    expect(shared.has('seq2name')).toBe(false);
    expect(shared.getAll('seqName2')).toEqual(Array.isArray(fields.seqName2) ? fields.seqName2 : [fields.seqName2]);
  });

  test('only legacy canonical anchors infer protected names, not matching text or explicit user identity', () => {
    const labels = [
      { text: 'Former default renamed', anchor: { sequence: '1', end: 'start', offset: { x: 0, y: 0 } } },
      { text: 'Seq. 2', position: { x: 1, y: 2 } },
      { text: 'User-anchored', sequenceNameFor: null, anchor: { sequence: '2', end: 'end', offset: { x: 0, y: 0 } } },
      { text: 'Opposite terminal', anchor: { sequence: '1', end: 'end', offset: { x: 0, y: 0 } } },
    ];
    const decoded = decodeUrlState(new URLSearchParams({ textAnnotations: JSON.stringify(labels) }));
    expect(decoded.annotations.textAnnotations.map(item => item.sequenceNameFor)).toEqual(['1', null, null, null]);
  });
});
