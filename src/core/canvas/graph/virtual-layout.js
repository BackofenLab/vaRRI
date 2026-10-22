import { simpleXyCoordinates } from './coordinates.js';
import { classifyElements } from './elements.js';

/** Two invisible polygon vertices at each strand break, with separate identity. */
export function createVirtualLayout(pairtable, breaks, positions) {
  const length = pairtable[0];
  const order = [];
  const realToLayout = [];
  const virtuals = [];
  for (let num = 1; num <= length; num++) {
    order.push(num);
    realToLayout[num] = order.length;
    if (breaks.includes(num)) {
      for (let slot = 0; slot < 2; slot++) {
        const index = length + virtuals.length + 1;
        order.push(index);
        virtuals.push({ index, boundary: num, slot, layoutIndex: order.length - 1 });
      }
    }
  }
  const layoutPairs = Array(order.length + 1).fill(0);
  layoutPairs[0] = order.length;
  for (let num = 1; num <= length; num++) {
    if (pairtable[num]) layoutPairs[realToLayout[num]] = realToLayout[pairtable[num]];
  }
  const xy = simpleXyCoordinates(layoutPairs);
  const realPositions = positions?.length ? positions :
    realToLayout.slice(1).map(index => xy[index - 1]);
  const virtualPositions = virtuals.map(({ boundary, slot, layoutIndex }) => {
    if (!positions?.length) return xy[layoutIndex];
    const a = positions[boundary - 1], b = positions[boundary];
    const fraction = (slot + 1) / 3;
    return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
  });
  const elements = classifyElements(layoutPairs).map(([type, depth, members]) =>
    [type, depth, members.map(index => order[index - 1] || 0)]);
  return { realPositions, virtualPositions, virtuals, elements };
}

export function addVirtualNodes(graph, layout) {
  layout.virtuals.forEach(({ boundary, slot }, index) => {
    const [x, y] = layout.virtualPositions[index];
    graph.nodes.push({
      uid: `break${boundary}:${slot}`, name: '', num: -2, radius: 0,
      nodeType: 'middle', elemType: 'f', layoutRole: 'strand-break',
      scaffoldType: 'exterior', external: true,
      boundary, nucs: [], rna: graph, x, y, px: x, py: y,
    });
  });
}
