import { syncPositions } from './svg.js';
import { createSimulation } from './simulation.js';

/** Collision and spring parameters retain the pinned Fornac layout behavior. */
function collideNodes(graph, d3) {
  const nodes = graph.nodes.filter(node => node.nodeType !== 'middle');
  const tree = d3.quadtree(nodes, node => node.x, node => node.y);
  nodes.forEach(node => {
    const radius = node.radius + 16;
    tree.visit((quad, x1, y1, x2, y2) => {
      // Modern quadtrees keep coincident points in a linked list of leaves.
      for (let leaf = quad; leaf; leaf = leaf.next) {
        const other = leaf.data;
        if (other && other !== node) {
          let dx = node.x - other.x;
          let dy = node.y - other.y;
          let length = Math.hypot(dx, dy);
          const minimum = node.radius + other.radius;
          if (length < minimum && !node.fixed && !other.fixed) {
            // Coincident points need a deterministic direction instead of 0/0.
            if (length < 1e-9) { dx = node.index < other.index ? -0.01 : 0.01; dy = 0; length = 0.01; }
            const gain = (length - minimum) / length * 0.1;
            node.x -= dx *= gain;
            node.y -= dy *= gain;
            other.x += dx;
            other.y += dy;
          }
        }
      }
      return x1 > node.x + radius || x2 < node.x - radius ||
        y1 > node.y + radius || y2 < node.y - radius;
    });
  });
}

export function createForce(container, d3) {
  return createSimulation(container, d3)
    .on('tick.graph', () => { collideNodes(container.graph, d3); syncPositions(container, d3); });
}
