import { clientToGraphPosition } from './text-annotation-geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
export const INTERACTION_TARGET = 'g.gnode, [data-varri-text]';

/** Only rendered, visible objects are selectable; force scaffolds never are. */
export function interactionTargets(container) {
  const nodes = Array.from(container.svg.querySelectorAll('g.gnode')).map(element => ({
    element, node: element.__data__, layer: element.parentNode,
    position: { x: element.__data__.x, y: element.__data__.y },
  }));
  const state = container.varriTextAnnotations;
  const texts = Array.from(state?.entries || []).filter(([, entry]) => entry.position)
    .map(([id, entry]) => ({ element: entry.group, id, layer: state.layer, position: { ...entry.position } }));
  return [...nodes, ...texts].filter(target => {
    const style = container.svg.ownerDocument.defaultView.getComputedStyle(target.element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/** Direction arrows belong to the backbone, not the selectable nucleotide. */
export function selectionBounds(element) {
  const nucleotide = element.querySelector('circle[node_type="nucleotide"]');
  return (nucleotide || element).getBoundingClientRect();
}

export function enclosed(element, rectangle) {
  const box = selectionBounds(element);
  return (box.width > 0 || box.height > 0) && box.left >= rectangle.left &&
    box.right <= rectangle.right && box.top >= rectangle.top && box.bottom <= rectangle.bottom;
}

export function selectionRectangle(start, end) {
  return { left: Math.min(start.x, end.x), right: Math.max(start.x, end.x),
    top: Math.min(start.y, end.y), bottom: Math.max(start.y, end.y) };
}

/** Screen-aligned feedback lives outside the graph and never affects its bounds. */
export function createSelectionOverlay(svg) {
  const layer = svg.ownerDocument.createElementNS(SVG_NS, 'g');
  layer.setAttribute('data-varri-interaction-overlay', 'true');
  layer.setAttribute('pointer-events', 'none');
  svg.appendChild(layer);
  function outline(bounds, marquee = false) {
    if (!svg.getScreenCTM?.()) return;
    const start = clientToGraphPosition(svg, bounds.left, bounds.top);
    const end = clientToGraphPosition(svg, bounds.right, bounds.bottom);
    const rect = svg.ownerDocument.createElementNS(SVG_NS, 'rect');
    const padding = marquee ? 0 : 2;
    rect.setAttribute('x', start.x - padding);
    rect.setAttribute('y', start.y - padding);
    rect.setAttribute('width', Math.max(0, end.x - start.x) + padding * 2);
    rect.setAttribute('height', Math.max(0, end.y - start.y) + padding * 2);
    rect.setAttribute('fill', '#2563eb');
    rect.setAttribute('fill-opacity', marquee ? '0.10' : '0.06');
    rect.setAttribute('stroke', '#2563eb');
    rect.setAttribute('stroke-width', '1.5');
    rect.setAttribute('vector-effect', 'non-scaling-stroke');
    if (marquee) rect.setAttribute('stroke-dasharray', '5 3');
    layer.appendChild(rect);
  }
  return {
    draw(selected, rectangle) {
      layer.replaceChildren();
      selected.forEach(element => outline(selectionBounds(element)));
      if (rectangle) outline(rectangle, true);
    },
    dispose() { layer.remove(); },
  };
}
