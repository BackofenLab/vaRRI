import { getIndexDictionary } from './indexing.js';
import { getIntermolBasepairRegion } from './region-paths.js';

/**
 * Validate whether a label marker should be placed at the given position.
 *
 * Prevents two adjacent markers from being displayed simultaneously.
 *
 * @param {number} pos
 * @param {Object.<number, number>} indexing
 * @param {number} number
 * @returns {number}  The number to place, or 0 to suppress.
 */
export function validateLabelPos(pos, indexing, number, indexDict) {
  for (const neighbor of [pos - 1, pos + 1]) {
    if (indexDict && indexDict[neighbor]?.[0] !== indexDict[pos]?.[0]) continue;
    if (neighbor in indexing && indexing[neighbor] !== 0) {
      return 0;
    }
  }
  return number;
}

/** Return every combined nucleotide position and its selected index label. */
export function getIndexLabelValues(v) {
  const {
    structure1,
    structure2,
    sequence1,
    labelInterval,
    molecules,
    sequence_dict
  } = v;
  const length1 = sequence1.length;
  const lengthTotal = Object.keys(sequence_dict).length;
  const indexDict = getIndexDictionary(v);
  const indexLabels = {};
  for (const key of Object.keys(indexDict)) {
    indexLabels[parseInt(key, 10)] = 0;
  }

  // Priority 1 — sequence boundaries
  for (const pos of [1, length1, length1 + 1, lengthTotal]) {
    if (!(pos in indexDict)) break;
    const [, number] = indexDict[pos];
    indexLabels[pos] = validateLabelPos(pos, indexLabels, number, indexDict);
  }

  // Priority 2 — intermolecular basepair region boundaries
  if (molecules === '2') {
    const basepairRegion = getIntermolBasepairRegion(structure1, structure2);
    for (const region of basepairRegion) {
      for (const pos of region) {
        if (!(pos in indexDict)) continue;
        const [, number] = indexDict[pos];
        indexLabels[pos] = validateLabelPos(pos, indexLabels, number, indexDict);
      }
    }
  }

  // Priority 3 — every labelInterval
  for (const [posStr, [, number]] of Object.entries(indexDict)) {
    const pos = parseInt(posStr, 10);
    if (number % labelInterval === 0 || number === 1) {
      indexLabels[pos] = validateLabelPos(pos, indexLabels, number, indexDict);
    }
  }
  return indexLabels;
}

export function listVisibleIndexLabelPositions(v) {
  const positions = new Set(Object.entries(getIndexLabelValues(v)).filter(([, value]) => value !== 0).map(([position]) => Number(position)));
  (Array.isArray(v.pointMutations) ? v.pointMutations : []).forEach(mutation => {
    const nodeId = Number(mutation.nodeId);
    if (Number.isInteger(nodeId)) positions.add(nodeId);
  });
  return positions;
}
