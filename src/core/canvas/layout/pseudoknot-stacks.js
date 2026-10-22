import { resolveGraphNodeFromEndpoint } from './graph-access.js';
import { addScaffoldHub, connectScaffoldHubs } from '../graph/scaffold.js';

/** Use the ordinary stem scaffold, including hubs, spokes and diagonals. */
export function updatePseudoknotStackConstraints(graph, enabled) {
  if (!Array.isArray(graph?.links) || !Array.isArray(graph.nodes)) return;
  // Remove rather than disable these springs: D3 counts even zero-strength
  // links when computing the bias of every other spring at their endpoints.
  graph.links = graph.links.filter(link => !link.pseudoknotScaffold);
  graph.nodes = graph.nodes.filter(node => !node.pseudoknotScaffold);
  if (!enabled) return;

  const pairs = new Map();
  const backbone = new Set();
  const paired = new Set();
  for (const link of graph.links) {
    if (!['backbone', 'basepair', 'pseudoknot'].includes(link.linkType)) continue;
    let source = resolveGraphNodeFromEndpoint(graph, link.source);
    let target = resolveGraphNodeFromEndpoint(graph, link.target);
    if (source?.nodeType !== 'nucleotide' || target?.nodeType !== 'nucleotide') continue;
    if (source.num > target.num) [source, target] = [target, source];
    const key = `${source.num}:${target.num}`;
    if (link.linkType === 'backbone') backbone.add(key);
    else {
      pairs.set(key, { source, target, pseudoknot: link.linkType === 'pseudoknot' });
      paired.add(source.num);
      paired.add(target.num);
    }
  }

  const added = [];
  const metadata = { pseudoknotScaffold: true };
  const indices = new Map(graph.nodes.map((node, index) => [node.num, index + 1]));
  for (const outer of pairs.values()) {
    const a = outer.source.num, b = outer.target.num;
    let nextA = a + 1, nextB = b - 1;
    while (nextA < nextB && !paired.has(nextA)) nextA++;
    while (nextB > nextA && !paired.has(nextB)) nextB--;
    const inner = pairs.get(`${nextA}:${nextB}`);
    if (!inner || !(outer.pseudoknot || inner.pseudoknot)) continue;
    // As for ordinary stems, an intervening unpaired stretch forms an interior
    // polygon rather than a four-corner stack. Never bridge strand breaks or
    // pass through another pair to create a conflicting loop constraint.
    const left = Array.from({ length: nextA - a + 1 }, (_, index) => a + index);
    const right = Array.from({ length: b - nextB + 1 }, (_, index) => nextB + index);
    if (![left, right].every(side => side.slice(1).every((num, index) =>
      backbone.has(`${side[index]}:${num}`)))) continue;
    const members = [...left, ...right].map(num => indices.get(num));
    added.push(addScaffoldHub(graph, members, members.length === 4 ? 's' : 'i',
      `pseudoknot:${a}:${b}`, metadata));
  }
  connectScaffoldHubs(graph, added, metadata);
}
