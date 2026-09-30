/** Real nucleotides define the translation frame; labels and force hubs do not. */
export function nucleotideCentroid(graph) {
  const nodes = (graph?.nodes || []).filter(node => node.nodeType === 'nucleotide' &&
    Number.isFinite(node.x) && Number.isFinite(node.y));
  if (!nodes.length) return { x: 0, y: 0 };
  return nodes.reduce((center, node) => ({
    x: center.x + node.x / nodes.length,
    y: center.y + node.y / nodes.length,
  }), { x: 0, y: 0 });
}

export function terminalPosition(graph, validated, anchor) {
  const length1 = validated.sequence1.length;
  const length2 = validated.sequence2.length;
  if (anchor.sequence === '2' && !length2) return null;
  const start = anchor.sequence === '2' ? length1 + 1 : 1;
  const end = anchor.sequence === '2' ? length1 + length2 : length1;
  const node = graph.nodes.find(item => item.nodeType === 'nucleotide' &&
    item.num === (anchor.end === 'end' ? end : start));
  if (!node || ![node.x, node.y].every(Number.isFinite)) return null;
  return { x: node.x + anchor.offset.x, y: node.y + anchor.offset.y };
}

/** Map client pixels through both plot zoom and annotation rotation. */
export function clientToGraphPosition(layer, clientX, clientY) {
  if (![clientX, clientY].every(Number.isFinite)) throw new Error('Text position must be finite.');
  const matrix = layer.getScreenCTM?.();
  if (!matrix) throw new Error('Text annotation coordinates are unavailable.');
  const { a, b, c, d, e, f } = matrix;
  const determinant = a * d - b * c;
  if (![a, b, c, d, e, f, determinant].every(Number.isFinite) || Math.abs(determinant) < 1e-12) {
    throw new Error('Text annotation coordinates are unavailable.');
  }
  const x = clientX - e, y = clientY - f;
  return { x: (d * x - c * y) / determinant, y: (a * y - b * x) / determinant };
}
