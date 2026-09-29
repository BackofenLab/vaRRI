import { listIntermolNodes } from './brackets.js';
import { getIndexDictionary, getNodeIdForSequencePosition } from './indexing.js';

/**
 * Derive a true sequence-position range (matching offset/skip-zero
 * numbering) for a given sequence from a list of combined node/structure
 * positions (as produced by {@link listIntermolPairs} or
 * {@link getIntermolBasepairRegion}).
 *
 * @param {Object} v
 * @param {number[]} positions  Combined node positions (1-based, contiguous).
 * @param {'1'|'2'} sequence
 * @returns {[number, number]|null}
 */
export function getBackgroundRangeForPositions(v, positions, sequence) {
  const indexDict = getIndexDictionary(v);
  const values = positions.map(position => indexDict[position]).filter(entry => Array.isArray(entry) && entry[0] === `s${sequence}`).map(([, seqPosition]) => seqPosition).filter(Number.isFinite);
  if (values.length === 0) return null;
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Compute the generated region-highlight ranges for the "entire
 * intermolecular region" background-highlighting mode, expressed as true
 * sequence positions (matching offset/skip-zero numbering).
 *
 * @param {Object} v  Validated parameter dictionary.
 * @returns {{sequence1Range:[number,number], sequence2Range:[number,number]}|null}
 */
export function computeBackgroundRegionRanges(v) {
  const basepairRegion = getIntermolBasepairRegion(v.structure1, v.structure2);
  if (!basepairRegion || basepairRegion.length < 2) return null;
  const sequence1Range = getBackgroundRangeForPositions(v, basepairRegion[0], '1');
  const sequence2Range = getBackgroundRangeForPositions(v, basepairRegion[1], '2');
  if (!sequence1Range || !sequence2Range) return null;
  return {
    sequence1Range,
    sequence2Range
  };
}

/**
 * Build the node-ID path for a region highlight's filled polygon.
 *
 * @param {Object} v
 * @param {Object} highlight
 * @returns {number[]}
 */
export function getRegionHighlightNodePath(v, highlight) {
  const nodeIds = [];
  const seq1Range = Array.isArray(highlight.sequence1Range) ? highlight.sequence1Range : [];
  const seq2Range = Array.isArray(highlight.sequence2Range) ? highlight.sequence2Range : [];
  for (let position = seq1Range[0]; position <= seq1Range[1]; position++) {
    const nodeId = getNodeIdForSequencePosition(v, '1', position);
    if (nodeId) nodeIds.push(nodeId);
  }
  for (let position = seq2Range[0]; position <= seq2Range[1]; position++) {
    const nodeId = getNodeIdForSequencePosition(v, '2', position);
    if (nodeId) nodeIds.push(nodeId);
  }
  return nodeIds;
}

/**
 * Compute [start, end] ranges of intermolecular basepair regions.
 *
 * @param {string} structure1
 * @param {string} structure2
 * @returns {Array<[number, number]>}
 */
export function getIntermolBasepairRegion(structure1, structure2) {
  const basepairRegion = [];
  const offset = structure1.length;
  for (const [structure, shift] of [[structure1, 0], [structure2, offset]]) {
    const basepairList = listIntermolNodes(structure, shift).map(([idx]) => idx);
    if (basepairList.length === 0) return [];
    basepairRegion.push([basepairList[0], basepairList[basepairList.length - 1]]);
  }
  return basepairRegion;
}
