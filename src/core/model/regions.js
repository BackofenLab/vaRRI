import { DEFAULT_COLORS } from "./colors.js";
import { parseSubsequences } from './input.js';
import { clearRegistry, getRegistryItem, listRegistryItems, registerRegistryItem, removeRegistryItem } from './registry.js';

/**
 * Return a deep-enough clone of a region-highlight object for external consumers.
 *
 * @param {Object} highlight
 * @returns {Object}
 */
export function cloneRegionHighlight(highlight) {
  return {
    id: highlight.id,
    sequence1Range: [highlight.sequence1Range[0], highlight.sequence1Range[1]],
    sequence2Range: [highlight.sequence2Range[0], highlight.sequence2Range[1]],
    color: highlight.color,
    alpha: highlight.alpha,
    rangeText: highlight.rangeText,
    generated: !!highlight.generated
  };
}

/**
 * Normalize a range input for region highlighting.
 *
 * @param {string|Array<number|[number, number]>} rangeInput
 * @param {{id: string, offset:number, length:number}=} context
 * @returns {{range:[number, number], rangeText:string}}
 */
export function normaliseRegionRange(rangeInput, context = {}) {
  if (typeof rangeInput === 'string') {
    const ranges = parseSubsequences(rangeInput, context.offset, context.length, context.id);
    if (!ranges || ranges.length === 0) {
      throw new Error('Region range must not be empty.');
    }
    if (ranges.length > 1) {
      throw new Error('Region highlighting supports a single range per sequence.');
    }
    const [start, end] = ranges[0];
    return {
      range: [start, end],
      rangeText: rangeInput.trim()
    };
  }
  if (!Array.isArray(rangeInput) || rangeInput.length === 0) {
    throw new Error('Region range must not be empty.');
  }
  const pair = rangeInput;
  if (!Array.isArray(pair) || pair.length !== 2) {
    throw new Error('Invalid region range. Expected [start, end].');
  }
  const start = Number(pair[0]);
  const end = Number(pair[1]);
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error('Invalid region range. Range bounds must be integers.');
  }
  if (start === 0 || end === 0) {
    throw new Error('Invalid region range. Index 0 is not valid.');
  }
  if (start > end) {
    throw new Error('Invalid region range. Start index must be <= end index.');
  }
  if (context) {
    parseSubsequences(`${start}-${end}`, context.offset, context.length, context.id);
  }
  return {
    range: [start, end],
    rangeText: `${start}-${end}`
  };
}

/**
 * Build a normalized region-highlight object from user input.
 *
 * @param {{sequence1Range:string|[number, number], sequence2Range:string|[number, number], color?:string, alpha?:number, generated?:boolean, id?:number}} input
 * @param {{'1'?:{offset:number, length:number}, '2'?:{offset:number, length:number}}=} sequenceContext
 * @returns {{id:number, sequence1Range:[number, number], sequence2Range:[number, number], color:string, rangeText:string, generated:boolean}}
 */
export function createRegionHighlight(input, sequenceContext = {}, colors = DEFAULT_COLORS) {
  const context1 = sequenceContext['1'];
  const context2 = sequenceContext['2'];
  const seq1Range = normaliseRegionRange(input.sequence1Range, context1);
  const seq2Range = normaliseRegionRange(input.sequence2Range, context2);
  const color = (input.color || '').trim() || colors.backgroundHighlight;
  const alpha = input.alpha !== undefined ? Number(input.alpha) : 0.2;
  return {
    id: Number.isInteger(input.id) ? input.id : 0,
    sequence1Range: seq1Range.range,
    sequence2Range: seq2Range.range,
    color,
    alpha,
    rangeText: `${seq1Range.rangeText}&${seq2Range.rangeText}`,
    generated: !!input.generated
  };
}

/**
 * Register a new region highlight object.
 *
 * @param {{sequence1Range:string|[number, number], sequence2Range:string|[number, number], color?:string, alpha?:number, generated?:boolean}} input
 * @param {{'1'?:{offset:number, length:number}, '2'?:{offset:number, length:number}}=} sequenceContext
 * @returns {Object}
 */
export function registerRegionHighlight(session, input, sequenceContext = {}) {
  return registerRegistryItem(session.annotations.regions, createRegionHighlight(input, sequenceContext, session.colors), cloneRegionHighlight);
}

/**
 * Update an existing region highlight object.
 *
 * @param {number} id
 * @param {{sequence1Range?:string|[number, number], sequence2Range?:string|[number, number], color?:string, generated?:boolean}} patch
 * @param {{'1'?:{offset:number, length:number}, '2'?:{offset:number, length:number}}=} sequenceContext
 * @returns {Object}
 */
export function updateRegionHighlight(session, id, patch, sequenceContext = {}) {
  const target = getRegistryItem(session.annotations.regions, id);
  const normalized = createRegionHighlight({
    id,
    sequence1Range: patch.sequence1Range !== undefined ? patch.sequence1Range : target.sequence1Range,
    sequence2Range: patch.sequence2Range !== undefined ? patch.sequence2Range : target.sequence2Range,
    color: patch.color !== undefined ? patch.color : target.color,
    alpha: patch.alpha !== undefined ? patch.alpha : target.alpha,
    generated: patch.generated !== undefined ? patch.generated : target.generated
  }, sequenceContext, session.colors);
  Object.assign(target, normalized);
  return cloneRegionHighlight(target);
}

/**
 * Remove a region highlight object by id.
 *
 * @param {number} id
 * @returns {boolean}
 */
export function removeRegionHighlight(session, id) {
  return removeRegistryItem(session.annotations.regions, id);
}

/**
 * Remove all registered region highlights.
 */
export function clearRegionHighlights(session) {
  clearRegistry(session.annotations.regions);
}

/**
 * Read registered region highlights.
 *
 * @returns {Array<Object>}
 */
export function getRegionHighlights(session) {
  return listRegistryItems(session.annotations.regions, cloneRegionHighlight);
}

/**
 * Remove all generated region highlights from the active registry.
 */
export function clearGeneratedRegionHighlights(session) {
  getRegionHighlights(session).filter(highlight => highlight.generated).forEach(highlight => {
    removeRegionHighlight(session, highlight.id);
  });
}

/**
 * Register a generated region highlight from sequence ranges.
 *
 * @param {Object} v
 * @param {{sequence1Range:[number, number], sequence2Range:[number, number], color?:string, alpha?:number}} spec
 * @returns {Object}
 */
export function registerGeneratedRegionHighlight(session, v, spec) {
  const sequenceContext = {
    '1': {
      offset: v.offset1,
      length: v.sequence1 ? v.sequence1.length : 0,
      sequence: v.sequence1
    },
    '2': {
      offset: v.offset2,
      length: v.sequence2 ? v.sequence2.length : 0,
      sequence: v.sequence2
    }
  };
  return registerRegionHighlight(session, {
    sequence1Range: spec.sequence1Range,
    sequence2Range: spec.sequence2Range,
    color: spec.color || session.colors.backgroundHighlight,
    alpha: spec.alpha,
    generated: true
  }, sequenceContext);
}
