'use strict';

import vaRRI from '../src/vaRRI.js';
import examples from '../example-data.js';

const decodeExample = example => vaRRI.decodeJsonState(example.vaRRIParams);

describe('shared example catalog', () => {
  test('contains the feature overview and the two existing literature examples', () => {
    expect(Object.keys(examples)).toEqual([
      '2mol',
      'coronel-tellez-2022',
      'wu-2024',
      'IntaRNA-seeds',
      'crossing-rri'
    ]);

    const literatureIds = Object.entries(examples)
      .filter(([, example]) => example.doi)
      .map(([id]) => id);

    expect(literatureIds).toEqual([
      'coronel-tellez-2022',
      'wu-2024',
    ]);
  });

  test.each(Object.entries(examples))('%s is a valid two-molecule RNA-RNA interaction', (_id, example) => {
    expect(example.name.trim()).not.toBe('');
    expect(example.description.trim()).not.toBe('');
    expect(example.vaRRIParams).toMatchObject({
      format: 'vaRRI', version: 1, fields: expect.any(Object), annotations: expect.any(Object),
      rotation: expect.any(Number), showRenderingOnly: expect.any(Boolean),
    });

    const { fields, annotations } = decodeExample(example);
    const { sequence, structure } = fields;
    expect(sequence.split('&')).toHaveLength(2);
    expect(structure.split('&')).toHaveLength(2);
    expect(sequence.split('&').every(Boolean)).toBe(true);
    expect(structure.split('&').every(Boolean)).toBe(true);

    const validated = vaRRI.validate({
      sequence,
      structure,
      ...fields, ...annotations,
      startIndex1: fields.startIndex1 ?? '1',
      startIndex2: fields.startIndex2 ?? '1',
      cropping: fields.cropping ?? '-1',
      coloring: fields.coloring ?? 'strand',
      highlighting: fields.highlighting ?? 'region',
      backgroundhighlighting: fields.backgroundhighlighting ?? 'basepairs',
      distinctBpTypes: fields.distinctBpTypes ?? true,
    });

    expect(validated.molecules).toBe('2');
  });

  test('stored JSON sessions retain the showcased annotations', () => {
    const coronel = decodeExample(examples['coronel-tellez-2022']);
    expect(coronel.fields).toMatchObject({
      cropping: '3',
      highlighting: 'basepairs',
      backgroundhighlighting: 'nothing',
    });
    expect(coronel.annotations.subsequenceHighlights).toHaveLength(4);
    expect(coronel.fields.profileData1).not.toBe('');
    expect(coronel.fields.profileData2).not.toBe('');

    const wu = decodeExample(examples['wu-2024']);
    expect(wu.annotations.subsequenceHighlights).toHaveLength(1);
    expect(wu.annotations.pointMutations).toHaveLength(4);
  });

  test('the feature showcase matches the replacement session', () => {
    const showcase = decodeExample(examples['2mol']);
    expect(showcase.fields).toMatchObject({
      seqName1: 'blue RNA', seqName2: 'the target', forceLayout: false,
      forceLayoutLinearRRI: true, profileColorRepresentsOne2: false,
    });
    expect(showcase.annotations).toMatchObject({
      pointMutations: expect.arrayContaining([expect.objectContaining({ position: 20, replacement: 'G' })]),
      subsequenceHighlights: expect.any(Array), regionHighlights: expect.any(Array),
    });
    expect(showcase.annotations.textAnnotations).toHaveLength(15);
  });
});
