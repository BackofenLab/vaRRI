import { clearRegistry, getRegistryItem, listRegistryItems, registerRegistryItem, removeRegistryItem } from './registry.js';
import { normalizeSequenceName, setSequenceNames } from './sequence-names.js';

const DEFAULT_STYLE = { bold: false, italic: false, size: 16, color: '#000000' };

function coordinates(value, label) {
  if (!value || typeof value !== 'object' || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new Error(`${label} must contain finite x and y coordinates.`);
  }
  return { x: value.x, y: value.y };
}

function normalizeAnchor(anchor) {
  if (anchor === undefined || anchor === null) return null;
  const sequence = String(anchor.sequence);
  if (!['1', '2'].includes(sequence) || !['start', 'end'].includes(anchor.end)) {
    throw new Error('Text annotation anchor must identify a sequence start or end.');
  }
  return { sequence, end: anchor.end, offset: coordinates(anchor.offset, 'Anchor offset') };
}

/**
 * Create plain annotation data. Position is null until placed, then an unrotated
 * offset from the current centroid of real nucleotides, in graph units. Keeping
 * that frame independent of the viewport makes labels follow global force drift
 * and preserves their placement through pan, zoom, rotation and rerendering.
 * Optional terminal anchors keep the initial sequence labels beside their ends.
 */
export function createTextAnnotation(input) {
  const sequenceNameFor = input?.sequenceNameFor == null ? null : String(input.sequenceNameFor);
  if (sequenceNameFor !== null && !['1', '2'].includes(sequenceNameFor)) {
    throw new Error('Sequence-name annotations must identify strand 1 or 2.');
  }
  if (!input || typeof input.text !== 'string' || (!sequenceNameFor && !input.text.trim())) {
    throw new Error('Text annotation text must not be empty.');
  }
  const supplied = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
  const style = { ...DEFAULT_STYLE, ...supplied };
  if (typeof style.bold !== 'boolean' || typeof style.italic !== 'boolean') {
    throw new Error('Text annotation bold and italic styles must be booleans.');
  }
  const size = Number(style.size);
  if (!Number.isFinite(size) || size < 1) {
    throw new Error('Text annotation size must be a finite number of at least 1.');
  }
  if (typeof style.color !== 'string' || !style.color.trim() || /[\u0000-\u001f\u007f-\u009f]/.test(style.color)) {
    throw new Error('Text annotation color must be a nonempty CSS color.');
  }
  return {
    id: Number.isInteger(input.id) ? input.id : 0,
    text: sequenceNameFor ? normalizeSequenceName(input.text, sequenceNameFor) : input.text.trim(),
    sequenceNameFor, bold: style.bold, italic: style.italic, size,
    color: style.color.trim(),
    position: input.position === undefined || input.position === null ? null : coordinates(input.position, 'Text annotation position'),
    anchor: normalizeAnchor(input.anchor),
  };
}

export function cloneTextAnnotation(item) {
  return { ...item, position: item.position && { ...item.position },
    anchor: item.anchor && { ...item.anchor, offset: { ...item.anchor.offset } } };
}

export function registerTextAnnotation(modelState, input) {
  const normalized = createTextAnnotation(input);
  const registry = modelState.annotations.texts;
  if (normalized.sequenceNameFor) {
    const existing = registry.items.find(item => item.sequenceNameFor === normalized.sequenceNameFor);
    setSequenceNames(modelState, { [`seqName${normalized.sequenceNameFor}`]: normalized.text });
    if (existing) {
      Object.assign(existing, normalized, { id: existing.id });
      return cloneTextAnnotation(existing);
    }
  }
  return registerRegistryItem(registry, normalized, cloneTextAnnotation);
}

/** Style/text edits preserve anchoring; placing or unplacing a label detaches it. */
export function updateTextAnnotation(modelState, id, patch) {
  const target = getRegistryItem(modelState.annotations.texts, id);
  const changes = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  if (Object.hasOwn(changes, 'sequenceNameFor') && changes.sequenceNameFor !== target.sequenceNameFor) {
    throw new Error('An annotation\'s sequence-name identity cannot be changed.');
  }
  const anchor = Object.hasOwn(changes, 'anchor') ? changes.anchor
    : Object.hasOwn(changes, 'position') ? null : target.anchor;
  const normalized = createTextAnnotation({ ...target, ...changes, id, anchor });
  Object.assign(target, normalized);
  if (target.sequenceNameFor) setSequenceNames(modelState, { [`seqName${target.sequenceNameFor}`]: target.text });
  return cloneTextAnnotation(target);
}

export function removeTextAnnotation(modelState, id) {
  const target = modelState.annotations.texts.items.find(item => item.id === id);
  if (target?.sequenceNameFor) {
    updateTextAnnotation(modelState, id, { position: null });
    return true;
  }
  return removeRegistryItem(modelState.annotations.texts, id);
}

/** Clearing is deliberate; only a new figure reset permits initial labels again. */
export function clearTextAnnotations(modelState, { resetDefaults = false } = {}) {
  const registry = modelState.annotations.texts;
  if (resetDefaults) clearRegistry(registry);
  else {
    registry.items = registry.items.filter(item => item.sequenceNameFor);
    registry.items.forEach(item => { item.position = null; item.anchor = null; });
  }
  registry.defaultsSuppressed = !resetDefaults;
}

export function getTextAnnotations(modelState) {
  return listRegistryItems(modelState.annotations.texts, cloneTextAnnotation);
}

/**
 * The canvas supplies positioned labels for the currently visible strands. Track
 * permanent strand identities so adding strand 2 creates its label while moving
 * or unplacing an existing name never causes its position to be reset.
 */
export function initializeDefaultTextAnnotations(modelState, defaults) {
  const registry = modelState.annotations.texts;
  const normalized = defaults.map(createTextAnnotation);
  if (normalized.some(item => !item.sequenceNameFor)) throw new Error('Default text annotations need a sequence-name identity.');
  normalized.forEach(item => {
    const existing = registry.items.find(candidate => candidate.sequenceNameFor === item.sequenceNameFor);
    if (existing) return;
    item.text = modelState[`seqName${item.sequenceNameFor}`];
    if (registry.defaultsSuppressed) { item.position = null; item.anchor = null; }
    registerRegistryItem(registry, item, cloneTextAnnotation);
  });
}
