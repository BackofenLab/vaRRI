import { createVaRRI } from '../src/core/index.js';
import { createModelState } from '../src/core/model/state.js';
import { getSequenceNames, normalizeSequenceName, setSequenceNames } from '../src/core/model/sequence-names.js';
import { registerTextAnnotation, updateTextAnnotation, getTextAnnotations, removeTextAnnotation,
  clearTextAnnotations, initializeDefaultTextAnnotations } from '../src/core/model/text-annotations.js';

const label = (sequence = '1') => ({ text: `Seq. ${sequence}`, sequenceNameFor: sequence, bold: true,
  position: { x: 12, y: -3 }, anchor: { sequence, end: sequence === '1' ? 'start' : 'end', offset: { x: 10, y: 20 } } });

test('names are headless, normalized and local to their API instance', () => {
  const api = createVaRRI({ get document() { throw new Error('Unexpected DOM access'); } });
  const other = createVaRRI();
  expect(api.getSequenceNames()).toEqual({ seq1name: 'Seq. 1', seq2name: 'Seq. 2' });
  expect(api.setSequenceNames({ seq1name: '  RNA α & β  ', seq2name: ' ' })).toEqual({ seq1name: 'RNA α & β', seq2name: 'Seq. 2' });
  const copy = api.getSequenceNames();
  copy.seq1name = 'Outside mutation';
  expect(api.getSequenceNames().seq1name).toBe('RNA α & β');
  expect(other.getSequenceNames().seq1name).toBe('Seq. 1');
  expect(normalizeSequenceName('', '2')).toBe('Seq. 2');
  expect(() => api.setSequenceNames({ seq1name: 'Should not apply', seq2name: null })).toThrow(/text/);
  expect(api.getSequenceNames().seq1name).toBe('RNA α & β');
});

test('protected annotation edits and sequence-name inputs update one model without moving labels', () => {
  const state = createModelState();
  const annotation = registerTextAnnotation(state, label());
  setSequenceNames(state, { seq1name: 'First name' });
  expect(getTextAnnotations(state)[0]).toEqual({ ...annotation, text: 'First name' });
  updateTextAnnotation(state, annotation.id, { text: 'Second name', size: 25 });
  expect(getSequenceNames(state).seq1name).toBe('Second name');
  expect(getTextAnnotations(state)[0]).toMatchObject({ position: annotation.position, anchor: annotation.anchor, size: 25 });
  updateTextAnnotation(state, annotation.id, { text: ' ' });
  expect(getSequenceNames(state).seq1name).toBe('Seq. 1');
  expect(() => updateTextAnnotation(state, annotation.id, { text: 'Ignored', sequenceNameFor: null })).toThrow(/identity/);
  expect(getSequenceNames(state).seq1name).toBe('Seq. 1');
});

test('dragged and unplaced names retain identity, styles, and model synchronization', () => {
  const state = createModelState();
  const annotation = registerTextAnnotation(state, label());
  updateTextAnnotation(state, annotation.id, { position: { x: 40, y: 50 } });
  expect(getTextAnnotations(state)[0]).toMatchObject({ sequenceNameFor: '1', anchor: null, position: { x: 40, y: 50 } });
  expect(removeTextAnnotation(state, annotation.id)).toBe(true);
  setSequenceNames(state, { seq1name: 'Still my name' });
  initializeDefaultTextAnnotations(state, [label()]);
  expect(getTextAnnotations(state)).toEqual([{ ...annotation, text: 'Still my name', position: null, anchor: null }]);
  const restored = JSON.parse(JSON.stringify(state));
  updateTextAnnotation(restored, annotation.id, { text: 'After reload' });
  expect(getSequenceNames(restored).seq1name).toBe('After reload');
});

test('registering a protected identity replaces that slot and clear cannot remove it', () => {
  const state = createModelState();
  const first = registerTextAnnotation(state, label());
  const second = registerTextAnnotation(state, label('2'));
  registerTextAnnotation(state, { text: 'User annotation' });
  const updated = registerTextAnnotation(state, { text: 'Shared name', sequenceNameFor: '1', position: null });
  expect(updated.id).toBe(first.id);
  expect(getSequenceNames(state).seq1name).toBe('Shared name');
  expect(getTextAnnotations(state)).toHaveLength(3);
  clearTextAnnotations(state);
  expect(getTextAnnotations(state)).toEqual([
    expect.objectContaining({ id: first.id, sequenceNameFor: '1', text: 'Shared name', position: null, anchor: null }),
    expect.objectContaining({ id: second.id, sequenceNameFor: '2', position: null, anchor: null }),
  ]);
  expect(registerTextAnnotation(state, { text: 'Next user annotation' }).id).toBeGreaterThan(second.id);
  clearTextAnnotations(state, { resetDefaults: true });
  expect(getTextAnnotations(state)).toEqual([]);
  expect(getSequenceNames(state).seq1name).toBe('Shared name');
});

test('validation is pure and only explicit names may override instance names during rendering', () => {
  const api = createVaRRI();
  const args = { sequence: 'ACGU', structure: '....' };
  const cached = api.validate(args);
  expect(cached).not.toHaveProperty('seq1name');
  expect(cached).not.toHaveProperty('seq2name');
  const v = api.validate({ ...args, seq1name: '  Explicit  ', seq2name: '' });
  expect(v).toMatchObject({ seq1name: 'Explicit', seq2name: 'Seq. 2' });
  expect(api.getSequenceNames()).toEqual({ seq1name: 'Seq. 1', seq2name: 'Seq. 2' });
  api.setSequenceNames({ seq1name: 'Edited' });
  expect(cached).not.toHaveProperty('seq1name');
  expect(api.getSequenceNames().seq1name).toBe('Edited');
});
