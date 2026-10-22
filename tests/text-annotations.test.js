import { createModelState } from '../src/core/model/state.js';
import { createTextAnnotation, registerTextAnnotation, updateTextAnnotation,
  getTextAnnotations, removeTextAnnotation, clearTextAnnotations,
  initializeDefaultTextAnnotations } from '../src/core/model/text-annotations.js';
import { validate } from '../src/core/model/validate.js';
import { createVaRRI, registerTextAnnotation as publicRegisterTextAnnotation } from '../src/core/index.js';

const positioned = () => ({ text: 'Seq. 1', bold: true, italic: true, size: 20,
  color: 'rebeccapurple', position: { x: -25.5, y: 30 }, sequenceNameFor: null,
  anchor: { sequence: '1', end: 'start', offset: { x: -20, y: -10 } } });
const nameLabel = (sequence = '1') => ({ ...positioned(), text: `Seq. ${sequence}`, sequenceNameFor: sequence,
  anchor: { sequence, end: sequence === '1' ? 'start' : 'end', offset: { x: -20, y: -10 } } });

describe('DOM-free text annotation model', () => {
  test('public registries remain headless and isolated', () => {
    const first = createVaRRI({
      get document() { throw new Error('Text model operations requested a document'); },
      createCanvas() { throw new Error('Text model operations requested a renderer'); },
    });
    const second = createVaRRI();
    const item = first.registerTextAnnotation({ text: 'Headless' });
    expect(first.updateTextAnnotation(item.id, { italic: true }).italic).toBe(true);
    expect(first.getTextAnnotations()).toHaveLength(1);
    expect(second.getTextAnnotations()).toEqual([]);
    expect(first.removeTextAnnotation(item.id)).toBe(true);
    first.clearTextAnnotations();
    expect(first.getTextAnnotations()).toEqual([]);
    expect(typeof publicRegisterTextAnnotation).toBe('function');
  });

  test('creates unpositioned literal text with editable default styles', () => {
    expect(createTextAnnotation({ text: '  α <RNA> & “label”  ', size: undefined })).toEqual({
      id: 0, text: 'α <RNA> & “label”', bold: false, italic: false,
      size: 16, color: '#000000', position: null, anchor: null, sequenceNameFor: null,
    });
  });

  test('registry isolates instances and clones every nested position/anchor', () => {
    const first = createModelState(), second = createModelState();
    const input = positioned();
    const added = registerTextAnnotation(first, input);
    input.position.x = 900;
    added.anchor.offset.y = 800;
    const copy = getTextAnnotations(first)[0];
    expect(copy.position.x).toBe(-25.5);
    expect(copy.anchor.offset.y).toBe(-10);
    copy.position.y = 700;
    expect(getTextAnnotations(first)[0].position.y).toBe(30);
    expect(getTextAnnotations(second)).toEqual([]);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  test('style updates retain placement and dragging detaches the default anchor', () => {
    const state = createModelState();
    const item = registerTextAnnotation(state, positioned());
    const edited = updateTextAnnotation(state, item.id, { text: 'Changed', size: '24', bold: false });
    expect(edited).toMatchObject({ text: 'Changed', size: 24, bold: false, position: item.position, anchor: item.anchor });
    expect(updateTextAnnotation(state, item.id, { position: { x: 1, y: 2 } })).toMatchObject({
      position: { x: 1, y: 2 }, anchor: null,
    });
    expect(updateTextAnnotation(state, item.id, { position: null }).position).toBeNull();
    expect(removeTextAnnotation(state, item.id)).toBe(true);
    expect(removeTextAnnotation(state, item.id)).toBe(false);
    expect(() => updateTextAnnotation(state, item.id, { text: 'Missing' })).toThrow(/not found/);
  });

  test('invalid edits do not change an existing annotation', () => {
    const state = createModelState();
    const item = registerTextAnnotation(state, positioned());
    expect(() => updateTextAnnotation(state, item.id, { text: ' ', position: null })).toThrow(/empty/);
    expect(getTextAnnotations(state)).toEqual([item]);
  });

  test.each([
    { text: '' }, { text: '  ' }, { text: null }, { size: NaN }, { size: Infinity },
    { size: 0 }, { size: -2 }, { size: null }, { bold: 'false' }, { italic: 1 },
    { color: '' }, { color: null }, { color: 'red\n' },
    { position: { x: Infinity, y: 1 } }, { position: { x: 1 } },
    { position: { x: '1', y: 2 } }, { position: false },
    { anchor: { sequence: '3', end: 'start', offset: { x: 0, y: 0 } } },
    { anchor: { sequence: '1', end: 'middle', offset: { x: 0, y: 0 } } },
    { anchor: { sequence: '1', end: 'end', offset: { x: 0, y: Infinity } } },
    { sequenceNameFor: '3' },
  ])('rejects invalid input %j', patch => {
    expect(() => createTextAnnotation({ text: 'Label', ...patch })).toThrow();
  });

  test('seeds defaults once while preserving custom text and deliberate clears', () => {
    const state = createModelState();
    registerTextAnnotation(state, { text: 'Custom before rendering' });
    initializeDefaultTextAnnotations(state, [nameLabel()]);
    initializeDefaultTextAnnotations(state, [nameLabel()]);
    expect(getTextAnnotations(state).map(item => item.text)).toEqual(['Custom before rendering', 'Seq. 1']);
    clearTextAnnotations(state);
    initializeDefaultTextAnnotations(state, [nameLabel()]);
    expect(getTextAnnotations(state)).toEqual([expect.objectContaining({ text: 'Seq. 1', position: null, anchor: null, sequenceNameFor: '1' })]);
    clearTextAnnotations(state, { resetDefaults: true });
    initializeDefaultTextAnnotations(state, [nameLabel()]);
    expect(getTextAnnotations(state)).toEqual([{ id: 1, ...nameLabel() }]);
  });

  test('introducing a second strand adds its default without restoring a removed first label', () => {
    const state = createModelState();
    const first = nameLabel(), second = nameLabel('2');
    initializeDefaultTextAnnotations(state, [first]);
    removeTextAnnotation(state, getTextAnnotations(state)[0].id);
    initializeDefaultTextAnnotations(state, [first, second]);
    expect(getTextAnnotations(state)).toEqual([
      expect.objectContaining({ text: 'Seq. 1', position: null, anchor: null, sequenceNameFor: '1' }),
      expect.objectContaining({ text: 'Seq. 2', position: second.position, sequenceNameFor: '2' }),
    ]);
    const item = getTextAnnotations(state)[1];
    updateTextAnnotation(state, item.id, { text: 'Moved label', position: { x: 7, y: 8 } });
    initializeDefaultTextAnnotations(state, [first]);
    const restored = JSON.parse(JSON.stringify(state));
    initializeDefaultTextAnnotations(restored, [first, second]);
    expect(getTextAnnotations(restored)).toEqual([
      expect.objectContaining({ text: 'Seq. 1', position: null, sequenceNameFor: '1' }),
      expect.objectContaining({ id: item.id, text: 'Moved label', anchor: null, position: { x: 7, y: 8 } }),
    ]);
  });

  test('explicit lists and deliberate clearing suppress defaults for subsequently added strands', () => {
    const first = nameLabel(), second = nameLabel('2');
    const state = createModelState();
    initializeDefaultTextAnnotations(state, [first]);
    clearTextAnnotations(state);
    initializeDefaultTextAnnotations(state, [first, second]);
    expect(getTextAnnotations(state).map(item => item.position)).toEqual([null, null]);
    registerTextAnnotation(state, { text: 'Explicit shared label' });
    initializeDefaultTextAnnotations(state, [first, second]);
    expect(getTextAnnotations(state).map(item => item.text)).toEqual(['Seq. 1', 'Seq. 2', 'Explicit shared label']);
    clearTextAnnotations(state, { resetDefaults: true });
    initializeDefaultTextAnnotations(state, [first, second]);
    expect(getTextAnnotations(state).map(item => item.text)).toEqual(['Seq. 1', 'Seq. 2']);
  });

  test('validate distinguishes missing text data, a deliberate empty list and positioned text', () => {
    const args = { sequence: 'ACGU', structure: '....' };
    expect(validate(args)).not.toHaveProperty('textAnnotations');
    expect(validate({ ...args, textAnnotations: [] }).textAnnotations).toEqual([]);
    expect(validate({ ...args, textAnnotations: [positioned()] }).textAnnotations[0]).toEqual({ id: 0, ...positioned() });
    expect(() => validate({ ...args, textAnnotations: {} })).toThrow(/array/);
    expect(() => validate({ ...args, textAnnotations: [{ text: '' }] })).toThrow(/empty/);
  });
});
