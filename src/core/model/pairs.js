import { listIntermolNodes } from './brackets.js';

/**
 * Parse basepairs from a dot-bracket-like structure dictionary.
 *
 * @param {Object.<string, string>} struc  Position → bracket character map.
 * @returns {Array<[number, number]>}  Sorted basepair index pairs.
 */
export function listBasepairs(struc) {
  const basepairs = [];
  const openBasepairs = {
    '(': [],
    '<': [],
    '[': [],
    '{': []
  };
  const brackets = [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>']];
  for (const [indexStr, char] of Object.entries(struc)) {
    const index = parseInt(indexStr, 10);
    for (const [open, close] of brackets) {
      if (char === open) {
        openBasepairs[open].push(index);
        break;
      }
      if (char === close) {
        if (openBasepairs[open].length > 0) {
          basepairs.push([openBasepairs[open].pop(), index]);
        }
        break;
      }
    }
  }
  basepairs.sort((a, b) => a[0] - b[0]);
  return basepairs;
}

/**
 * Extract intermolecular basepair pairs from the combined structure.
 *
 * @param {Object} v  Validated parameter dictionary.
 * @returns {Array<[number, number]>}
 */
export function listIntermolPairs(v) {
  const struc = v.structure_dict;
  const struc1 = v.structure1;
  const struc2 = v.structure2;
  const shift = struc1.length;
  const intermol = {};
  for (const i of Object.keys(struc)) intermol[i] = '.';
  for (const [index, bracket] of [...listIntermolNodes(struc1), ...listIntermolNodes(struc2, shift)]) {
    intermol[String(index)] = bracket;
  }
  return listBasepairs(intermol);
}

/**
 * Normalize base-pair endpoints and return a deterministic, duplicate-free
 * list ordered by the first and then the second nucleotide.
 *
 * @param {Array<[number, number]>} basepairs
 * @returns {Array<[number, number]>}
 */
export function normaliseBasepairList(basepairs) {
  const seen = new Set();
  const pairs = [];
  (Array.isArray(basepairs) ? basepairs : []).forEach(pair => {
    if (!Array.isArray(pair) || pair.length < 2) return;
    const first = Number(pair[0]);
    const second = Number(pair[1]);
    if (!Number.isInteger(first) || !Number.isInteger(second) || first === second) return;
    const normalized = first < second ? [first, second] : [second, first];
    const key = normalized[0] + ':' + normalized[1];
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(normalized);
  });
  return pairs.sort((left, right) => left[0] - right[0] || left[1] - right[1]);
}

/**
 * Find the direct nested children of every base pair.
 *
 * For a fixed outer pair, candidates are visited by increasing opening
 * endpoint. A candidate is covered by an earlier candidate exactly when
 * that earlier candidate has the larger closing endpoint. Keeping the
 * largest earlier closing endpoint therefore computes the cover relation
 * in O(n^2), without joining an outer pair to a deeper pair through an
 * intervening base-pair column.
 *
 * @param {Array<[number, number]>} basepairs
 * @returns {Array<{outer:[number,number],children:Array<[number,number]>}>}
 */
export function listDirectNestedPairChildren(basepairs) {
  const pairs = normaliseBasepairList(basepairs);
  return pairs.map((outer, outerIndex) => {
    const children = [];
    let largestEarlierClose = -Infinity;
    for (let innerIndex = outerIndex + 1; innerIndex < pairs.length; innerIndex++) {
      const inner = pairs[innerIndex];
      if (inner[0] >= outer[1]) break;
      if (inner[1] >= outer[1]) continue;
      if (largestEarlierClose <= inner[1]) children.push(inner);
      largestEarlierClose = Math.max(largestEarlierClose, inner[1]);
    }
    return {
      outer,
      children
    };
  });
}

export function pairEquals(left, right) {
  return left[0] === right[0] && left[1] === right[1];
}

export function pairsCross(left, right) {
  return left[0] < right[0] && right[0] < left[1] && left[1] < right[1] || right[0] < left[0] && left[0] < right[1] && right[1] < left[1];
}

export function createLoopBoundary(outer, inner, extra = {}) {
  const firstGap = inner[0] - outer[0] - 1;
  const secondGap = outer[1] - inner[1] - 1;
  return {
    outer: outer.slice(),
    inner: inner.slice(),
    gaps: [firstGap, secondGap],
    loopType: firstGap > 0 && secondGap > 0 ? 'interior' : 'bulge',
    ...extra
  };
}
