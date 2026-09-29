import { DEFAULT_COLORS } from "./colors.js";
import { getSequenceIndices } from './indexing.js';
import { validateOffset } from './input.js';
import { clearRegistry, getRegistryItem, listRegistryItems, registerRegistryItem, removeRegistryItem } from './registry.js';

/**
 * Return a deep-enough clone of a point-mutation object for external consumers.
 *
 * @param {Object} mutation
 * @returns {Object}
 */
export function clonePointMutation(mutation) {
  return {
    id: mutation.id,
    sequence: mutation.sequence,
    position: mutation.position,
    replacement: mutation.replacement,
    reference: mutation.reference,
    nodeId: mutation.nodeId,
    color: mutation.color,
    labelText: mutation.labelText
  };
}

/**
 * Validate and normalize a mutation sequence selector.
 *
 * @param {string|number} sequence
 * @returns {'1'|'2'}
 */
export function normaliseMutationSequence(sequence) {
  const seq = String(sequence);
  if (seq !== '1' && seq !== '2') {
    throw new Error('Mutation sequence must be "1" or "2".');
  }
  return seq;
}

/**
 * Build a map of valid sequence positions to their bases.
 *
 * @param {{offset:number, sequence:string}|undefined} context
 * @returns {Object.<number, string>}
 */
export function buildSequencePositionMap(context) {
  const map = {};
  if (!context || !Number.isInteger(context.offset) || typeof context.sequence !== 'string') {
    return map;
  }
  getSequenceIndices('s', context.offset, context.sequence.length).forEach(([, position], index) => {
    map[position] = context.sequence[index];
  });
  return map;
}

/**
 * Normalize a mutation position and validate it against the current sequence context.
 *
 * @param {number|string} positionInput
 * @param {{offset:number, sequence:string}|undefined} context
 * @returns {number}
 */
export function normaliseMutationPosition(positionInput, context) {
  if (positionInput === undefined || positionInput === null || positionInput === '') {
    throw new Error('Mutation position must not be empty.');
  }
  const position = validateOffset(String(positionInput));
  if (context) {
    const sequencePositionMap = buildSequencePositionMap(context);
    if (!(position in sequencePositionMap)) {
      throw new Error('Mutation position must be a valid sequence index.');
    }
  }
  return position;
}

/**
 * Validate a point-mutation replacement base.
 *
 * @param {string} replacement
 * @returns {string}
 */
export function normaliseMutationReplacement(replacement) {
  const newLetter = String(replacement || '').trim();
  if (newLetter.length !== 1) {
    throw new Error('Mutation replacement must be a single letter.');
  }
  return newLetter;
}

/**
 * Build a normalized point-mutation object from user input.
 *
 * @param {{sequence:string|number, position:number|string, replacement:string, color?:string, id?:number}} input
 * @param {{'1'?:{offset:number, sequence:string}, '2'?:{offset:number, sequence:string}}=} sequenceContext
 * @returns {{id:number, sequence:'1'|'2', position:number, replacement:string, reference:string, nodeId:number, color:string, labelText:string}}
 */
export function createPointMutation(input, sequenceContext = {}, colors = DEFAULT_COLORS) {
  const sequence = normaliseMutationSequence(input.sequence);
  const context = sequenceContext[sequence];
  const position = normaliseMutationPosition(input.position, context);
  const replacement = normaliseMutationReplacement(input.replacement);
  const color = (input.color || '').trim() || colors.intermolecularHighlight;
  const referenceMap = context ? buildSequencePositionMap(context) : {};
  const reference = referenceMap[position] || '';
  return {
    id: Number.isInteger(input.id) ? input.id : 0,
    sequence,
    position,
    replacement,
    reference,
    nodeId: 0,
    color,
    labelText: `${reference || '?'}${position}${replacement}`
  };
}

/**
 * Register a new point mutation.
 *
 * @param {{sequence:string|number, position:number|string, replacement:string, color?:string}} input
 * @param {{'1'?:{offset:number, sequence:string}, '2'?:{offset:number, sequence:string}}=} sequenceContext
 * @returns {Object}
 */
export function registerPointMutation(session, input, sequenceContext = {}) {
  return registerRegistryItem(session.annotations.mutations, createPointMutation(input, sequenceContext, session.colors), clonePointMutation);
}

/**
 * Update an existing point mutation.
 *
 * @param {number} id
 * @param {{sequence?:string|number, position?:number|string, replacement?:string, color?:string}} patch
 * @param {{'1'?:{offset:number, sequence:string}, '2'?:{offset:number, sequence:string}}=} sequenceContext
 * @returns {Object}
 */
export function updatePointMutation(session, id, patch, sequenceContext = {}) {
  const target = getRegistryItem(session.annotations.mutations, id);
  const normalized = createPointMutation({
    id,
    sequence: patch.sequence !== undefined ? patch.sequence : target.sequence,
    position: patch.position !== undefined ? patch.position : target.position,
    replacement: patch.replacement !== undefined ? patch.replacement : target.replacement,
    color: patch.color !== undefined ? patch.color : target.color
  }, sequenceContext, session.colors);
  Object.assign(target, normalized);
  return clonePointMutation(target);
}

/**
 * Remove a point mutation by id.
 *
 * @param {number} id
 * @returns {boolean}
 */
export function removePointMutation(session, id) {
  return removeRegistryItem(session.annotations.mutations, id);
}

/**
 * Remove all registered point mutations.
 */
export function clearPointMutations(session) {
  clearRegistry(session.annotations.mutations);
}

/**
 * Read registered point mutations.
 *
 * @returns {Array<Object>}
 */
export function getPointMutations(session) {
  return listRegistryItems(session.annotations.mutations, clonePointMutation);
}
