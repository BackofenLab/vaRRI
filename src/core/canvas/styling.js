import { addStyleToNodes } from './dom.js';
import { sequenceColoring } from '../model/colors.js';
import { getIntermolBasepairRegion } from '../model/region-paths.js';

/**
 * Apply strand-based coloring to all nucleotide circles in the canvas plot.
 *
 * @param {{sequence1: string, sequence2: string}} v
 */
export function changeBackgroundColor(session, v) {
  const coloring = sequenceColoring(session, v.sequence1, v.sequence2);
  if (coloring.length === 0) return;
  const nodes = session.dom.querySelectorAll('[r="5"]');
  nodes.forEach((node, index) => {
    node.setAttribute('style', `fill: ${coloring[index]};`);
  });
}

/**
 * Highlight nodes in the intermolecular basepair region with a stroke.
 *
 * @param {Object} v  Validated parameter dictionary.
 */
export function highlightRegion(session, v) {
  const basepairRegion = getIntermolBasepairRegion(v.structure1, v.structure2);
  const intermolNodes = [];
  for (const [start, end] of basepairRegion) {
    for (let i = start; i <= end; i++) intermolNodes.push(i);
  }
  addStyleToNodes(session, intermolNodes, `stroke: ${session.colors.intermolecularHighlight};`);
}

/**
 * Highlight individual intermolecular basepair nodes with a stroke.
 *
 * @param {Object} v  Validated parameter dictionary.
 */
export function highlightBasepairs(session, v) {
  const split = v.sequence1.length + 1;
  // Highlight all nodes that are part of intermolecular basepairs of main layouting (basepair) or 2ndary layouting (pseudoknot)
  for (const type of ["basepair", "pseudoknot"]) {
    session.dom.querySelectorAll(`[link_type="${type}"]`).forEach(link => {
      const nodes = [parseInt(link.getAttribute('start'), 10), parseInt(link.getAttribute('end'), 10)];
      if (!(nodes[0] < split && nodes[1] >= split)) return;
      nodes.forEach(nodeNum => {
        const node = session.dom.querySelector(`circle[node_num="${nodeNum}"]`);
        if (node) {
          node.setAttribute('style', (node.getAttribute('style') || '') + `stroke: ${session.colors.intermolecularHighlight};`);
        }
      });
    });
  }
}

/**
 * Remove duplicate basepair links (keep only links where start < end).
 */
export function removeSecondLink(session) {
  session.dom.querySelectorAll('[link_type="basepair"]').forEach(link => {
    const start = parseInt(link.getAttribute('start'), 10);
    const end = parseInt(link.getAttribute('end'), 10);
    if (start > end) link.remove();
  });
}

export function removeDummyNodes() {/* Compatibility: graphs no longer contain gap nucleotides. */}

/**
 * Apply point-mutation styling to nucleotide nodes.
 *
 * @param {Object} v
 */
export function applyPointMutations(session, v) {
  const mutations = Array.isArray(v.pointMutations) ? v.pointMutations : [];
  mutations.forEach(mutation => {
    if (!mutation.nodeId) return;
    addStyleToNodes(session, [mutation.nodeId], `stroke: ${mutation.color}; stroke-width: 2px;`);
  });
}

/**
 * Visualise basepairs: apply the basepair colour to all basepair links,
 * and additionally mark G-U basepairs with a dashed line style.
 *
 * @param {Object} v  Validated parameter dictionary.
 */
export function styleBasepairs(session, v) {
  // Apply basepair colour to all basepair links using inline style so it
  // overrides the Fornac CSS rule `line.fornac-link[link_type="basepair"]
  // { stroke: red; }`, which takes precedence over SVG presentation
  // attributes.
  session.dom.querySelectorAll('[link_type="basepair"]').forEach(link => {
    link.style.stroke = session.colors.basepair;
  });
  if (v.distinctBpTypes) {
    // Build a 1-based sequence map with contiguous nucleotide IDs
    const seq1 = v.sequence1;
    const seq2 = v.sequence2;
    const combined = seq1 + seq2;
    const seqDict = {};
    for (let i = 0; i < combined.length; i++) {
      seqDict[String(i + 1)] = combined[i];
    }
    session.dom.querySelectorAll('[link_type="basepair"], [link_type="pseudoknot"]').forEach(link => {
      const l1 = seqDict[link.getAttribute('start')];
      const l2 = seqDict[link.getAttribute('end')];
      const bp = [l1, l2].sort().join('-').toLowerCase();
      if (bp === 'g-u') {
        link.style.strokeLinecap = 'butt';
        link.style.strokeDasharray = '1 1';
      } else if (bp === 'c-g' || bp === 'a-u') {
        link.style.strokeLinecap = 'butt';
        link.style.strokeDasharray = '';
      } else {
        link.style.strokeLinecap = 'round';
        link.style.strokeDasharray = '0 3';
      }
    });
  } else {
    session.dom.querySelectorAll('[link_type="basepair"], [link_type="pseudoknot"]').forEach(link => {
      link.style.strokeLinecap = 'butt';
      link.style.strokeDasharray = '';
    });
  }
}
