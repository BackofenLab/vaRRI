import { resolveGraphNodeFromEndpoint } from './graph-access.js';

/**
 * Identify exterior loop scaffolds, including loops interrupted by a strand
 * boundary. The graph records their purpose explicitly; nucleotide identity is
 * never changed to represent a break. Legacy closure metadata remains readable
 * for callers that provide their own graph to the advanced layout helpers.
 */
export function getFreeableLoopScaffoldUids(graph) {
  if (!graph || !Array.isArray(graph.nodes)) return null;
  const closureNodes = graph.nodes.filter(node =>
    node?.nodeType === 'middle' && (node.num === -2 || node.num === -3)
  );
  const closureUids = new Set(closureNodes.map(node => node.uid).filter(Boolean));
  const closureIndices = new Set(closureNodes.map(node => graph.nodes.indexOf(node) + 1));
  const hubUids = new Set();
  const memberUids = new Set(closureUids);
  for (const hub of graph.nodes) {
    if (hub?.nodeType !== 'middle' || hub.num !== -1 || !Array.isArray(hub.nucs)) continue;
    const members = hub.nucs.map(index => graph.nodes[index - 1]).filter(Boolean);
    const external = hub.scaffoldType !== undefined
      ? hub.scaffoldType === 'exterior' || hub.external === true
      : hub.nucs.some(index => closureIndices.has(index)) || members.some(node => node.elemType === 'e');
    if (!external) continue;
    hubUids.add(hub.uid);
    members.forEach(node => { if (node.uid) memberUids.add(node.uid); });
  }
  return closureUids.size || hubUids.size ? { closureUids, hubUids, memberUids } : null;
}

/** Remove only exterior-loop forces, retaining real nodes and other scaffolds. */
export function relaxForceGraphScaffold(container) {
  const graph = container?.graph;
  const scaffold = getFreeableLoopScaffoldUids(graph);
  if (!scaffold) return false;
  const removableNodeUids = new Set([...scaffold.closureUids, ...scaffold.hubUids]);
  graph.links = graph.links.filter(link => {
    if (link?.linkType !== 'fake' && link?.linkType !== 'fake_fake') return true;
    const source = resolveGraphNodeFromEndpoint(graph, link.source);
    const target = resolveGraphNodeFromEndpoint(graph, link.target);
    if (removableNodeUids.has(source?.uid) || removableNodeUids.has(target?.uid)) return false;
    // Chords remember their owning scaffold, so neighboring interior loops
    // sharing a nucleotide with an exterior loop retain their own constraints.
    if (link.scaffoldUid) return !scaffold.hubUids.has(link.scaffoldUid);
    return !(scaffold.memberUids.has(source?.uid) && scaffold.memberUids.has(target?.uid));
  });
  graph.nodes = graph.nodes.filter(node => !removableNodeUids.has(node?.uid));
  container.update?.();
  if (typeof container.force?.resume === 'function') container.force.resume();
  else container.force?.start?.();
  return true;
}

/** Restart D3 after changing strength so it refreshes its per-link force cache. */
export function applyPseudoknotLinkStrength(container, enabled) {
  if (!container?.linkStrengths) return;
  container.linkStrengths.pseudoknot = enabled ? 10 : 0;
  container.force?.start?.();
}
