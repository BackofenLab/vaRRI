import { addElement, getPositionOfNode } from './dom.js';
import { polygon, polyline } from './shapes.js';
import { getIndexDictionary } from '../model/indexing.js';
import { listIntermolPairs } from '../model/pairs.js';
import { computeBackgroundRegionRanges, getBackgroundRangeForPositions, getRegionHighlightNodePath } from '../model/region-paths.js';
import { clearGeneratedRegionHighlights, getRegionHighlights, registerGeneratedRegionHighlight } from '../model/regions.js';

/**
 * Highlight subsequence ranges with polyline/circle overlays.
 *
 * @param {Object} v  Validated parameter dictionary.
 * @param {"1"|"2"} seq  Which sequence to highlight.
 * @param {Array<[number, number]>} range  Parsed index range.
 * @param {string} color  Highlight color.
 * @param {number} Highlight opacity.
 */
export function highlightSubsequence(session, v, seq, range, color, alpha) {
  const highlightDiameter = 14;
  const keyOffset = `offset${seq}`;

  // Map RNA index → graph node ID for the relevant sequence
  const indexDict = {};
  for (const [web, [mol, index]] of Object.entries(getIndexDictionary(v))) {
    if (mol === `s${seq}`) {
      indexDict[index] = parseInt(web, 10);
    }
  }
  const shift = seq === '2' ? v.sequence1.length : 0;
  for (const [start, end] of range || []) {
    const startIndex = v[keyOffset];
    if (start === end) {
      const webId = indexDict[start];
      const [x, y] = getPositionOfNode(session, webId);
      addElement(session, 'circle', {
        cx: String(x),
        cy: String(y),
        r: `${Math.ceil(highlightDiameter / 2)}px`,
        style: `fill:${color};opacity:${alpha};`,
        'data-varri-subseq': 'true'
      });
      continue;
    }
    let distance1 = start - startIndex;
    let distance2 = end - start;
    if (startIndex < 0 && start > 0) distance1 -= 1;
    if (start < 0 && end > 0) distance2 -= 1;
    const startNode = distance1 + 1 + shift;
    const endNode = distance1 + distance2 + 1 + shift;
    const indices = [];
    for (let i = startNode; i <= endNode; i++) indices.push(i);
    polyline(session, indices, `stroke:${color};stroke-width:14;opacity:${alpha};fill:None;` + 'stroke-linejoin:round;stroke-linecap:round', {
      'data-varri-subseq': 'true'
    });
  }
}

/**
 * Apply all region highlights from the active registry.
 *
 * @param {Object} v
 */
export function applyRegionHighlights(session, v) {
  const registryHighlights = getRegionHighlights(session.modelState);
  const highlights = registryHighlights.length > 0 ? registryHighlights : Array.isArray(v.regionHighlights) ? v.regionHighlights : [];
  highlights.forEach(highlight => {
    const nodePath = getRegionHighlightNodePath(v, highlight);
    if (nodePath.length >= 3) {
      polygon(session, nodePath, `fill:${highlight.color || session.colors.backgroundHighlight};opacity:${highlight.alpha};stroke:${highlight.color || session.colors.backgroundHighlight};stroke-width:7`, {
        'data-varri-region': 'true'
      });
    } else if (nodePath.length === 2) {
      polyline(session, nodePath, `stroke:${highlight.color || session.colors.backgroundHighlight};opacity:${highlight.alpha};stroke-width:7`, {
        'data-varri-region': 'true'
      });
    }
  });
}

/**
 * Apply all subsequence highlights from `v.subsequenceHighlights`.
 *
 * @param {Object} v
 */
export function applySubsequenceHighlights(session, v) {
  const highlights = Array.isArray(v.subsequenceHighlights) ? v.subsequenceHighlights : [];
  highlights.forEach(highlight => {
    highlightSubsequence(session, v, highlight.sequence, highlight.range, highlight.color || session.colors.subsequenceHighlight, highlight.alpha);
  });
}

/**
 * Add background highlighting for intermolecular basepair stacks.
 *
 * @param {Object} v  Validated parameter dictionary.
 */
export function backgroundhighlightBasepairs(session, v) {
  const intermolPairs = listIntermolPairs(v);
  if (intermolPairs.length === 0) {
    clearGeneratedRegionHighlights(session.modelState);
    return;
  }
  let stack = [intermolPairs.shift()];
  const highlightAreas = [];
  for (const [open, close] of intermolPairs) {
    const [stackOpen, stackClose] = stack[stack.length - 1];
    if (open - 1 === stackOpen && close + 1 === stackClose) {
      stack.push([open, close]);
      continue;
    }
    const area = stack.flatMap(([a, b]) => [a, b]).sort((a, b) => a - b);
    highlightAreas.push(area);
    stack = [[open, close]];
  }
  const area = stack.flatMap(([a, b]) => [a, b]).sort((a, b) => a - b);
  highlightAreas.push(area);
  clearGeneratedRegionHighlights(session.modelState);
  highlightAreas.forEach(region => {
    const seq1Range = getBackgroundRangeForPositions(v, region, '1');
    const seq2Range = getBackgroundRangeForPositions(v, region, '2');
    if (seq1Range && seq2Range) {
      registerGeneratedRegionHighlight(session.modelState, v, {
        sequence1Range: seq1Range,
        sequence2Range: seq2Range,
        color: session.colors.backgroundHighlight
      });
    }
  });
}

/**
 * Add background highlighting for the entire intermolecular region.
 *
 * @param {Object} v  Validated parameter dictionary.
 */
export function backgroundhighlightRegion(session, v) {
  const ranges = computeBackgroundRegionRanges(v);
  if (!ranges) {
    return;
  }
  registerGeneratedRegionHighlight(session.modelState, v, {
    sequence1Range: ranges.sequence1Range,
    sequence2Range: ranges.sequence2Range,
    color: session.colors.backgroundHighlight
  });
}
