import { clearRegistry, getRegistryItem, listRegistryItems, registerRegistryItem, removeRegistryItem } from './registry.js';

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
  if (!input || typeof input.text !== 'string' || !input.text.trim()) {
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
    text: input.text.trim(), bold: style.bold, italic: style.italic, size,
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
  return registerRegistryItem(modelState.annotations.texts, createTextAnnotation(input), cloneTextAnnotation);
}

/** Style/text edits preserve anchoring; placing or unplacing a label detaches it. */
export function updateTextAnnotation(modelState, id, patch) {
  const target = getRegistryItem(modelState.annotations.texts, id);
  const changes = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  const anchor = Object.hasOwn(changes, 'anchor') ? changes.anchor
    : Object.hasOwn(changes, 'position') ? null : target.anchor;
  const normalized = createTextAnnotation({ ...target, ...changes, id, anchor });
  Object.assign(target, normalized);
  return cloneTextAnnotation(target);
}

export function removeTextAnnotation(modelState, id) {
  return removeRegistryItem(modelState.annotations.texts, id);
}

/** Clearing is deliberate; only a new figure reset permits initial labels again. */
export function clearTextAnnotations(modelState, { resetDefaults = false } = {}) {
  const registry = modelState.annotations.texts;
  clearRegistry(registry);
  registry.defaultsSuppressed = !resetDefaults;
  registry.initializedDefaultAnchors = [];
}

export function getTextAnnotations(modelState) {
  return listRegistryItems(modelState.annotations.texts, cloneTextAnnotation);
}

/**
 * The canvas supplies positioned labels for the currently visible strands. Track
 * each terminal independently so adding strand 2 later creates its initial label,
 * while removing or moving an existing default never causes it to return.
 */
export function initializeDefaultTextAnnotations(modelState, defaults) {
  const registry = modelState.annotations.texts;
  if (registry.defaultsSuppressed) return;
  const normalized = defaults.map(createTextAnnotation);
  if (normalized.some(item => !item.anchor)) throw new Error('Default text annotations need a terminal anchor.');
  normalized.forEach(item => {
    const key = `${item.anchor.sequence}:${item.anchor.end}`;
    if (registry.initializedDefaultAnchors.includes(key)) return;
    registerRegistryItem(registry, item, cloneTextAnnotation);
    registry.initializedDefaultAnchors.push(key);
  });
}
