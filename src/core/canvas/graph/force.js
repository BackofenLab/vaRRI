import { syncPositions } from './svg.js';

/** Collision and spring parameters retain the pinned Fornac layout behavior. */
function collideNodes(graph, d3) {
  const nodes = graph.nodes.filter(node => node.nodeType !== 'middle');
  const tree = d3.geom.quadtree(nodes);
  nodes.forEach(node => {
    const radius = node.radius + 16;
    tree.visit((quad, x1, y1, x2, y2) => {
      const other = quad.point;
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
      return x1 > node.x + radius || x2 < node.x - radius ||
        y1 > node.y + radius || y2 < node.y - radius;
    });
  });
}

export function createForce(container, d3) {
  const options = container.options;
  return d3.layout.force()
    .charge(node => node.nodeType === 'middle' ? options.middleCharge : options.otherCharge)
    .friction(options.friction)
    .linkDistance(link => options.linkDistanceMultiplier * link.value)
    .linkStrength(link => container.linkStrengths[link.linkType] ?? container.linkStrengths.other)
    .gravity(0).chargeDistance(options.chargeDistance)
    .size([options.svgW, options.svgH])
    .on('tick.graph', () => { collideNodes(container.graph, d3); syncPositions(container, d3); });
}

export function attachDragging(container, groups, d3) {
  if (!container.options.animation) return;
  const allGroups = () => d3.select(container.layers.nodes).selectAll('g.gnode');
  const selected = () => container.graph.nodes.filter(node => node.selected);
  const drag = d3.behavior.drag()
    .on('dragstart.graph', node => {
      const event = d3.event.sourceEvent;
      event.stopPropagation();
      if (!node.selected) {
        if (!event.ctrlKey && !event.metaKey) container.graph.nodes.forEach(item => { item.selected = false; });
        node.selected = true;
      }
      selected().forEach(item => { item.dragFixed = item.fixed || 0; item.fixed = 1; });
      allGroups().classed('fornac-selectedNode', item => !!item.selected);
    })
    .on('drag.graph', () => {
      selected().forEach(node => {
        node.x += d3.event.dx; node.px += d3.event.dx;
        node.y += d3.event.dy; node.py += d3.event.dy;
      });
      syncPositions(container, d3);
      container.force.resume();
    })
    .on('dragend.graph', () => {
      selected().forEach(node => { node.fixed = node.dragFixed; delete node.dragFixed; });
      container.force.resume();
    });
  groups.call(drag);
}
