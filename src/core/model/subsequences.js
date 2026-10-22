import { DEFAULT_COLORS } from "./colors.js";
import { parseSubsequences } from './input.js';
import { clearRegistry, getRegistryItem, listRegistryItems, registerRegistryItem, removeRegistryItem } from './registry.js';

/**
 * Return a deep-enough clone of a highlight object for external consumers.
 *
 * @param {Object} highlight
 * @returns {Object}
 */
export function cloneSubsequenceHighlight(highlight) {
  return {
    id: highlight.id,
    sequence: highlight.sequence,
    range: highlight.range.map(([start, end]) => [start, end]),
    color: highlight.color,
    alpha: highlight.alpha,
    rangeText: highlight.rangeText
  };
}

/**
 * Validate and normalize a sequence selector for subsequence highlighting.
 *
 * @param {string|number} sequence
 * @returns {'1'|'2'}
 */
export function normaliseHighlightSequence(sequence) {
  const seq = String(sequence);
  if (seq !== '1' && seq !== '2') {
    throw new Error('Highlight sequence must be "1" or "2".');
  }
  return seq;
}

/**
 * Normalize and validate a highlight range input.
 *
 * @param {string|Array<[number, number]>} rangeInput
 * @param {{id:string, offset:number, length:number}=} context
 * @returns {{range:Array<[number, number]>, rangeText:string}}
 */
export function normaliseHighlightRanges(rangeInput, context) {
  if (typeof rangeInput === 'string') {
    const range = parseSubsequences(rangeInput, context ? context.offset : undefined, context ? context.length : undefined, context ? context.id : undefined);
    if (!range || range.length === 0) {
      throw new Error('Highlight range must not be empty.');
    }
    return {
      range,
      rangeText: rangeInput.trim()
    };
  }
  if (!Array.isArray(rangeInput) || rangeInput.length === 0) {
    throw new Error('Highlight range must not be empty.');
  }
  const range = rangeInput.map((pair, idx) => {
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new Error(`${context?.id ? context.id + ": " : ""} Invalid subsequence range ${pair} at index ${idx}. Expected [start, end].`);
    }
    const start = Number(pair[0]);
    const end = Number(pair[1]);
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      throw new Error(`${context?.id ? context.id + ": " : ""}Invalid subsequence range at index ${idx}. Range bounds must be integers.`);
    }
    if (start === 0 || end === 0) {
      throw new Error(`${context?.id ? context.id + ": " : ""}Invalid subsequence range at index ${idx}. Index 0 is not valid.`);
    }
    if (start > end) {
      throw new Error(`${context?.id ? context.id + ": " : ""}Invalid subsequence range at index ${idx}. Start index must be <= end index.`);
    }
    return [start, end];
  });
  if (context) {
    parseSubsequences(range.map(([start, end]) => `${start}-${end}`).join(','), context.offset, context.length, context.id);
  }
  return {
    range,
    rangeText: range.map(([start, end]) => `${start}-${end}`).join(',')
  };
}

/**
 * Build a normalized subsequence-highlight object from user input.
 *
 * @param {{sequence:string|number, range:string|Array<[number, number]>, color?:string, alpha?:number, id?:number}} input
 * @param {{'1'?:{offset:number, length:number}, '2'?:{offset:number, length:number}}=} sequenceContext
 * @returns {{id:number, sequence:'1'|'2', range:Array<[number, number]>, color:string, rangeText:string}}
 */
export function createSubsequenceHighlight(input, sequenceContext = {}, colors = DEFAULT_COLORS) {
  const sequence = normaliseHighlightSequence(input.sequence);
  const context = sequenceContext[sequence];
  const normalizedRange = normaliseHighlightRanges(input.range, context);
  const color = (input.color || '').trim() || colors.subsequenceHighlight;
  const alpha = input.alpha !== undefined ? Number(input.alpha) : 0.3;
  return {
    id: Number.isInteger(input.id) ? input.id : 0,
    sequence,
    range: normalizedRange.range,
    color,
    alpha,
    rangeText: normalizedRange.rangeText
  };
}

/**
 * Register a new subsequence highlight object.
 *
 * @param {{sequence:string|number, range:string|Array<[number, number]>, color?:string, alpha?:number}} input
 * @param {{'1'?:{offset:number, length:number}, '2'?:{offset:number, length:number}}=} sequenceContext
 * @returns {Object}
 */
export function registerSubsequenceHighlight(modelState, input, sequenceContext = {}) {
  return registerRegistryItem(modelState.annotations.subsequences, createSubsequenceHighlight(input, sequenceContext, modelState.colors), cloneSubsequenceHighlight);
}

/**
 * Update an existing subsequence highlight object.
 *
 * @param {number} id
 * @param {{sequence?:string|number, range?:string|Array<[number, number]>, color?:string}} patch
 * @param {{'1'?:{offset:number, length:number}, '2'?:{offset:number, length:number}}=} sequenceContext
 * @returns {Object}
 */
export function updateSubsequenceHighlight(modelState, id, patch, sequenceContext = {}) {
  const target = getRegistryItem(modelState.annotations.subsequences, id);
  const normalized = createSubsequenceHighlight({
    id,
    sequence: patch.sequence !== undefined ? patch.sequence : target.sequence,
    range: patch.range !== undefined ? patch.range : target.range,
    color: patch.color !== undefined ? patch.color : target.color,
    alpha: patch.alpha !== undefined ? patch.alpha : target.alpha
  }, sequenceContext, modelState.colors);
  Object.assign(target, normalized);
  return cloneSubsequenceHighlight(target);
}

/**
 * Remove a subsequence highlight object by id.
 *
 * @param {number} id
 * @returns {boolean}
 */
export function removeSubsequenceHighlight(modelState, id) {
  return removeRegistryItem(modelState.annotations.subsequences, id);
}

/**
 * Remove all registered subsequence highlights.
 */
export function clearSubsequenceHighlights(modelState) {
  clearRegistry(modelState.annotations.subsequences);
}

/**
 * Read registered subsequence highlights.
 *
 * @returns {Array<Object>}
 */
export function getSubsequenceHighlights(modelState) {
  return listRegistryItems(modelState.annotations.subsequences, cloneSubsequenceHighlight);
}
