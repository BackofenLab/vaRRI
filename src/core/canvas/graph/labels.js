/** Label geometry adapted from Fornac v1.0.1 rnagraph.js (Apache-2.0). */
export function addLabels(graph, interval = 1) {
  if (!(interval > 0)) return;
  const { nodes, pairtable: pt, rnaLength: length } = graph;
  for (let i = 1; i <= length; i++) {
    if (i % interval !== 0) continue;
    const anchor = nodes[i - 1];
    let previous = nodes[(i - 2 + length) % length];
    let next = nodes[i % length];
    if (pt[anchor.num] && pt[previous.num] && pt[next.num]) {
      previous = next = nodes[pt[anchor.num] - 1];
    }
    const inward = pt[anchor.num] && (!pt[previous.num] || !pt[next.num]);
    let vx = (next.x + previous.x - 2 * anchor.x) * (inward ? -1 : 1);
    let vy = (next.y + previous.y - 2 * anchor.y) * (inward ? -1 : 1);
    let magnitude = Math.hypot(vx, vy);
    if (magnitude < 1e-9) {
      // A single node or a straight strand has no angle bisector.
      vx = -(next.y - previous.y);
      vy = next.x - previous.x;
      magnitude = Math.hypot(vx, vy);
      if (magnitude < 1e-9) { vx = 0; vy = 1; magnitude = 1; }
    }
    const x = anchor.x - 15 * vx / magnitude;
    const y = anchor.y - 15 * vy / magnitude;
    const label = {
      uid: `label${i}`, name: i, num: -1, anchor: i, radius: 6,
      nodeType: 'label', elemType: 'l', structName: graph.structName,
      rna: graph, x, y, px: x, py: y,
    };
    nodes.push(label);
    graph.links.push({ source: anchor, target: label, value: 1,
      linkType: 'label_link', uid: `label_link:${i}` });
  }
}
