import { resolveGraphNodeFromEndpoint } from './graph-access.js';

/** Add the two reciprocal diagonals used by ordinary stem rectangles. */
export function updatePseudoknotStackConstraints(graph, enabled) {
  if (!Array.isArray(graph?.links)) return;
  // Remove rather than disable these springs: D3 counts even zero-strength
  // links when computing the bias of every other spring at their endpoints.
  graph.links = graph.links.filter(link => link.linkType !== 'pseudoknot_scaffold');
  if (!enabled) return;

  const pairs = new Map();
  const backbone = new Set();
  for (const link of graph.links) {
    if (!['backbone', 'basepair', 'pseudoknot'].includes(link.linkType)) continue;
    let source = resolveGraphNodeFromEndpoint(graph, link.source);
    let target = resolveGraphNodeFromEndpoint(graph, link.target);
    if (source?.nodeType !== 'nucleotide' || target?.nodeType !== 'nucleotide') continue;
    if (source.num > target.num) [source, target] = [target, source];
    const key = `${source.num}:${target.num}`;
    if (link.linkType === 'backbone') backbone.add(key);
    else pairs.set(key, { source, target, pseudoknot: link.linkType === 'pseudoknot' });
  }

  for (const outer of pairs.values()) {
    const a = outer.source.num, b = outer.target.num;
    const inner = pairs.get(`${a + 1}:${b - 1}`);
    if (!inner || !(outer.pseudoknot || inner.pseudoknot)) continue;
    // Consecutive IDs can straddle a strand break. Both stack sides must have
    // an actual backbone edge; bulges and isolated crossing pairs stay free.
    if (!backbone.has(`${a}:${a + 1}`) || !backbone.has(`${b - 1}:${b}`)) continue;
    for (const [first, second] of [[outer.source, inner.target], [inner.source, outer.target]]) {
      for (const [source, target] of [[first, second], [second, first]]) {
        graph.links.push({ source, target, value: Math.SQRT2,
          linkType: 'pseudoknot_scaffold',
          uid: `pseudoknot_scaffold:${source.uid}:${target.uid}` });
      }
    }
  }
}
