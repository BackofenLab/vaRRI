import { findBasePairs } from '../../model/brackets.js';
import { createVirtualLayout, addVirtualNodes } from './virtual-layout.js';
import { addLabels } from './labels.js';
import { addScaffolds } from './scaffold.js';

/**
 * Keep a maximum-cardinality noncrossing subset for the polygon layout.
 * Adapted from Fornac's Ronny Lorenz maximum matching algorithm (Apache-2.0).
 * Each nucleotide has one partner, so only that partner needs inspection.
 * Crossing pairs are retained separately as visible pseudoknot links.
 */
export function planarize(pairtable) {
  const n = pairtable[0];
  const scores = Array.from({ length: n + 2 }, () => new Uint32Array(n + 2));
  for (let i = n - 1; i > 0; i--) {
    for (let j = i + 1; j <= n; j++) {
      const partner = pairtable[j];
      scores[i][j] = scores[i][j - 1];
      if (partner >= i && partner < j) {
        const score = scores[i][partner - 1] + 1 + scores[partner + 1][j - 1];
        scores[i][j] = Math.max(scores[i][j], score);
      }
    }
  }
  const planar = Array(n + 1).fill(0);
  planar[0] = n;
  const pending = [[1, n]];
  while (pending.length) {
    const [i, j] = pending.pop();
    if (i >= j) continue;
    if (scores[i][j - 1] === scores[i][j]) {
      pending.push([i, j - 1]);
    } else {
      const partner = pairtable[j];
      planar[partner] = j;
      planar[j] = partner;
      pending.push([i, partner - 1], [partner + 1, j - 1]);
    }
  }
  return planar;
}

export function makeLink(source, target, linkType, value = 1, extra = {}) {
  return {
    source, target, linkType, value,
    uid: `${linkType}:${source.uid}:${target.uid}`,
    ...extra,
  };
}

/** Build an entirely plain force graph, independent of D3 and the DOM. */
export function createRnaGraph(structure, options = {}) {
  const strands = structure.split('&');
  const dotbracket = strands.join('');
  const sequence = (options.sequence || '').replaceAll('&', '');
  if (!dotbracket.length || sequence.length !== dotbracket.length) {
    throw new Error('The RNA sequence and structure must have the same nonzero length.');
  }
  const breaks = [];
  let boundary = 0;
  strands.slice(0, -1).forEach(strand => {
    boundary += strand.length;
    breaks.push(boundary);
  });
  const pairs = findBasePairs(dotbracket).map(([a, b]) => [a + 1, b + 1]);
  const allPairs = Array(dotbracket.length + 1).fill(0);
  allPairs[0] = dotbracket.length;
  pairs.forEach(([a, b]) => { allPairs[a] = b; allPairs[b] = a; });
  const pairtable = planarize(allPairs);
  const layout = createVirtualLayout(pairtable, breaks, options.positions);
  const { elements, realPositions: positions } = layout;
  const elemTypes = {};
  [...elements].sort().forEach(([type, , members]) => {
    members.forEach(num => { elemTypes[num] = type; });
  });
  const graph = {
    nodes: [], links: [], elements, pairtable, allPairs, breaks,
    rnaLength: dotbracket.length, dotbracket, seq: sequence,
    uid: 'rna', structName: options.name || 'empty',
  };
  graph.nodes = [...sequence].map((name, index) => {
    const [x, y] = positions[index];
    return {
      uid: `n${index + 1}`, name, num: index + 1, radius: 5,
      nodeType: 'nucleotide', elemType: elemTypes[index + 1] || 'e',
      structName: graph.structName, rna: graph,
      x, y, px: x, py: y, linked: index > 0 && !breaks.includes(index),
    };
  });
  graph.nodes.forEach((node, index) => {
    node.prevNode = node.linked ? graph.nodes[index - 1] : null;
    node.nextNode = !breaks.includes(index + 1) ? graph.nodes[index + 1] || null : null;
    if (node.prevNode) graph.links.push(makeLink(node.prevNode, node, 'backbone'));
  });
  pairs.forEach(([a, b]) => {
    graph.links.push(makeLink(graph.nodes[a - 1], graph.nodes[b - 1],
      pairtable[a] === b ? 'basepair' : 'pseudoknot'));
  });
  addVirtualNodes(graph, layout);
  addLabels(graph, options.labelInterval ?? 1);
  addScaffolds(graph, options.circularizeExternal !== false);
  return graph;
}
