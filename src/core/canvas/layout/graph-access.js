

/** Resolve a nucleotide node by its 1-based graph node number. */
export function getGraphNucleotideByNumber(graph, nodeNumber) {
  if (!graph || !Array.isArray(graph.nodes)) return null;
  return graph.nodes.find(node => node && node.nodeType === 'nucleotide' && node.num === nodeNumber) || null;
}

export function getNodeDistance(first, second) {
  const coordinates = [first?.x, first?.y, second?.x, second?.y];
  if (!coordinates.every(value => typeof value === 'number' && Number.isFinite(value))) return null;
  const [firstX, firstY, secondX, secondY] = coordinates;
  return Math.hypot(secondX - firstX, secondY - firstY);
}

export function resolveGraphLinkNode(graph, endpoint) {
  if (endpoint && typeof endpoint === 'object') return endpoint;
  const index = Number(endpoint);
  return Number.isInteger(index) ? graph.nodes[index] || null : null;
}

/**
 * Resolve a force-graph link endpoint to a node object when possible.
 *
 * @param {Object} graph
 * @param {Object|number|string|null|undefined} endpoint
 * @returns {Object|null}
 */
export function resolveGraphNodeFromEndpoint(graph, endpoint) {
  if (endpoint && typeof endpoint === 'object') return endpoint;
  const idx = parseInt(String(endpoint), 10);
  if (!Number.isFinite(idx)) return null;
  if (Array.isArray(graph?.nodes) && graph.nodes[idx]) return graph.nodes[idx];
  if (Array.isArray(graph?.nodes)) {
    const byNumber = graph.nodes.find(node => node && node.num === idx);
    if (byNumber) return byNumber;
  }
  return null;
}
