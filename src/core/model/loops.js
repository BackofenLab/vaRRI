import { createLoopBoundary, listBasepairs, listDirectNestedPairChildren, listIntermolPairs, normaliseBasepairList, pairEquals, pairsCross } from './pairs.js';

/**
 * Identify intermolecular base-pair columns that directly bound RRI
 * bulges or interior loops.
 *
 * A result obeys the exact antiparallel cover relation from issue #59.
 * Fully stacked columns are excluded. A candidate touched by a crossing
 * RRI pair is also excluded because bulge/interior-loop decomposition is
 * not defined for that pseudoknotted region.
 *
 * @param {Object} v  Validated parameter dictionary.
 * @returns {Array<{outer:[number,number],inner:[number,number],gaps:[number,number],loopType:string}>}
 */
export function listRriLoopBoundaryPairs(v) {
  const pairs = normaliseBasepairList(listIntermolPairs(v));
  const boundaries = [];
  listDirectNestedPairChildren(pairs).forEach(({
    outer,
    children
  }) => {
    children.forEach(inner => {
      const firstGap = inner[0] - outer[0] - 1;
      const secondGap = outer[1] - inner[1] - 1;
      if (firstGap === 0 && secondGap === 0) return;
      const crossesBoundary = pairs.some(pair => {
        if (pairEquals(pair, outer) || pairEquals(pair, inner)) return false;
        if (pairsCross(pair, outer) || pairsCross(pair, inner)) return true;
        const firstInside = outer[0] < pair[0] && pair[0] < inner[0];
        const secondInside = inner[1] < pair[1] && pair[1] < outer[1];
        return firstInside !== secondInside;
      });
      if (!crossesBoundary) boundaries.push(createLoopBoundary(outer, inner));
    });
  });
  return boundaries;
}

/**
 * Group intramolecular base pairs by strand using graph node numbers.
 * Strand membership is determined by explicit sequence boundaries.
 *
 * @param {Object} v  Validated parameter dictionary.
 * @returns {{"1":Array<[number,number]>,"2":Array<[number,number]>}}
 */
export function listIntramolPairsBySequence(v) {
  const sequence1End = v.sequence1.length;
  const sequence2Start = sequence1End + 1;
  const sequence2End = sequence1End + v.sequence2.length;
  const grouped = {
    '1': [],
    '2': []
  };
  listBasepairs(v.structure_dict).forEach(pair => {
    if (pair[0] >= 1 && pair[1] <= sequence1End) {
      grouped['1'].push(pair);
    } else if (pair[0] >= sequence2Start && pair[1] <= sequence2End) {
      grouped['2'].push(pair);
    }
  });
  return grouped;
}

/**
 * Identify intramolecular bulges/interior loops independently per strand.
 * A true bulge/interior loop has one direct child stem; hairpins (zero),
 * multiloops (multiple), ordinary stacks, and crossing pairs are excluded.
 *
 * @param {Object} v  Validated parameter dictionary.
 * @returns {Array<{sequence:"1"|"2",outer:[number,number],inner:[number,number],gaps:[number,number],loopType:string}>}
 */
export function listStructureLoopBoundaryPairs(v) {
  const boundaries = [];
  const grouped = listIntramolPairsBySequence(v);
  for (const sequence of ['1', '2']) {
    const pairs = normaliseBasepairList(grouped[sequence]);
    listDirectNestedPairChildren(pairs).forEach(({
      outer,
      children
    }) => {
      if (children.length !== 1) return;
      const inner = children[0];
      const firstGap = inner[0] - outer[0] - 1;
      const secondGap = outer[1] - inner[1] - 1;
      if (firstGap === 0 && secondGap === 0) return;
      const touchesCrossing = pairs.some(pair => !pairEquals(pair, outer) && !pairEquals(pair, inner) && (pairsCross(pair, outer) || pairsCross(pair, inner)));
      if (!touchesCrossing) {
        boundaries.push(createLoopBoundary(outer, inner, {
          sequence
        }));
      }
    });
  }
  return boundaries;
}

export function loopBoundariesToConstraintSpecs(boundaries, kind) {
  const constraints = [];
  boundaries.forEach((boundary, index) => {
    const loopId = boundary.sequence ? kind + ':' + boundary.sequence + ':' + index : kind + ':' + index;
    const common = {
      kind,
      loopId,
      loopType: boundary.loopType
    };
    constraints.push({
      ...common,
      source: boundary.outer[0],
      target: boundary.inner[0],
      sequence: boundary.sequence || '1'
    });
    constraints.push({
      ...common,
      source: boundary.inner[1],
      target: boundary.outer[1],
      sequence: boundary.sequence || '2'
    });
  });
  return constraints;
}

/**
 * Build the two same-strand spring specifications for every RRI loop.
 * Rest lengths are intentionally absent here: they are measured from the
 * live graph coordinates when the springs are installed.
 *
 * @param {Object} v  Validated parameter dictionary.
 * @returns {Array<{source:number,target:number,sequence:"1"|"2",kind:string,loopId:string,loopType:string}>}
 */
export function getLinearRriConstraintSpecs(v) {
  return loopBoundariesToConstraintSpecs(listRriLoopBoundaryPairs(v), 'rri');
}

/**
 * Build the two same-strand spring specifications for every intramolecular
 * bulge/interior loop on either sequence.
 *
 * @param {Object} v  Validated parameter dictionary.
 * @returns {Array<{source:number,target:number,sequence:"1"|"2",kind:string,loopId:string,loopType:string}>}
 */
export function getLinearStructureConstraintSpecs(v) {
  return loopBoundariesToConstraintSpecs(listStructureLoopBoundaryPairs(v), 'structure');
}
