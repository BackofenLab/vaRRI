import { parseFasta } from '../src/ui/services/fasta-parser.js';
import { convertCsvProfileText, parseProfileText, mapProfileDataToAccessData } from '../src/ui/services/profile-data.js';
import { validate } from '../src/core/model/index.js';
import { createRegionsController } from '../src/ui/controllers/regions.js';

test('FASTA preserves headers, wrapped sequences and optional structures', () => {
  const records = parseFasta('>alpha description\nACGU\n((..\n>beta\nUGCA\n..))');
  expect(records.map(record => [record.id, record.sequence, record.structure])).toEqual([
    ['alpha', 'ACGU', '((..'], ['beta', 'UGCA', '..))'],
  ]);
  expect(records[0].description).toBe('description');
  expect(parseFasta('>wrapped\nAC G\nUAC\n')[0]).toMatchObject({ sequence: 'ACGUAC', structure: null });
});

test('FASTA rejects broken records instead of silently dropping sequence data', () => {
  expect(() => parseFasta('>empty')).toThrow(/no sequence/);
  expect(() => parseFasta('>mixed\nACGU\n....\nACGU')).toThrow(/strictly 2/);
});

test('CSV profiles convert headers and preserve zero probabilities', () => {
  const converted = convertCsvProfileText('position;probability\n1;0\n2;0.8');
  expect(converted).toBe('#position probability\n1 0\n2 0.8');
  expect(parseProfileText(converted, 'profileData1')).toEqual([
    { index: 1, value: 0 }, { index: 2, value: 0.8 },
  ]);
  expect(() => parseProfileText('1 1.5', 'profileData1')).toThrow();
});

test('profile mapping preserves signed biological positions across zero and both strands', () => {
  const molecule = validate({ sequence: 'ACGU&UGCA', structure: '((..&..))', startIndex1: '-2', startIndex2: '10' });
  expect(mapProfileDataToAccessData([{ index: -1, value: 0.3 }], '1', 'sequence', molecule, molecule))
    .toEqual({ 2: 0.3 });
  expect(mapProfileDataToAccessData([{ index: 1, value: 0.4 }], '2', '1', molecule, molecule))
    .toEqual({ 5: 0.4 });
  expect(() => mapProfileDataToAccessData([{ index: 0, value: 0.4 }], '1', 'sequence', molecule, molecule)).toThrow();
});

test('cropped profiles discard valid hidden positions but still reject nonexistent indices', () => {
  const args = { sequence: 'AAAAAA&UUUUUU', structure: '..((..&..))..' };
  const uncropped = validate(args), cropped = validate({ ...args, cropping: '1' });
  expect(mapProfileDataToAccessData([{ index: 1, value: 0.3 }, { index: 3, value: 0.8 }], '1', '1', cropped, uncropped))
    .toEqual({ 2: 0.8 });
  expect(() => mapProfileDataToAccessData([{ index: 20, value: 0.5 }], '1', '1', cropped, uncropped)).toThrow();
});

test.each(['region1', 'region2'])('malformed %s is reported on that field only', field => {
  const errors = {};
  const state = { fields: { region1: '1-2', region2: '3-4', regionColor: '#123456', regionAlpha: '0.2' } };
  state.fields[field] = 'not-a-range';
  const actions = {
    clearFieldErrors(names) { names.forEach(name => { delete errors[name]; }); },
    setFieldError(name, message) { errors[name] = message; },
  };
  const controller = createRegionsController({ api: {}, state, actions });
  expect(controller.validateRegionForm()).toBe(false);
  expect(Object.keys(errors)).toEqual([field]);
  expect(errors[field]).toContain('START-END');
});
