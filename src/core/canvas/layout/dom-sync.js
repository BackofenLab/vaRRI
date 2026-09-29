

/** Cache projected nodes, gently biased labels, and their visible links. */
export function createLinearHelixDomCache(session, graph, templates, labelBiases = [], syncWholeGraph = false) {
  if (typeof session.dom === 'undefined') return {
    nodes: [],
    links: []
  };
  const projectedNodes = syncWholeGraph ? new Set(graph.nodes) : new Set([...templates.flatMap(template => template.points.map(point => point.node)), ...labelBiases.map(bias => bias.label)]);
  const graphLinks = Array.isArray(graph.links) ? graph.links : [];
  const incidentLinks = syncWholeGraph ? new Set(graphLinks) : new Set(graphLinks.filter(link => projectedNodes.has(link?.source) || projectedNodes.has(link?.target)));
  return {
    nodes: Array.from(session.dom.querySelectorAll('g.gnode')).filter(element => projectedNodes.has(element.__data__)),
    links: Array.from(session.dom.querySelectorAll('line.link')).filter(element => incidentLinks.has(element.__data__))
  };
}

export function syncFornacDirectionArrow(element, node) {
  const arrow = element.querySelector?.('path.fornac-directionArrow');
  const previous = node?.prevNode;
  if (!arrow || !previous || !node.linked || ![node.x, node.y, previous.x, previous.y, node.radius].every(Number.isFinite)) {
    return;
  }
  let directionX = previous.x - node.x;
  let directionY = previous.y - node.y;
  const length = Math.hypot(directionX, directionY);
  if (!(length > 0)) return;
  directionX /= length;
  directionY /= length;
  const normalX = -directionY;
  const normalY = directionX;
  const tipX = (node.radius + 0.4) * directionX;
  const tipY = (node.radius + 0.4) * directionY;
  const size = 6;
  const width = 0.7;
  arrow.setAttribute('d', `M${tipX + size * (directionX / 2 + normalX * width / 2)},` + `${tipY + size * (directionY / 2 + normalY * width / 2)}` + `L${tipX},${tipY}` + `L${tipX + size * (directionX / 2 - normalX * width / 2)},` + `${tipY + size * (directionY / 2 - normalY * width / 2)}`);
}

/** Keep the current SVG in sync with post-tick projection. */
export function syncLinearHelixDom(cache) {
  cache.nodes.forEach(element => {
    const node = element.__data__;
    if (!node || ![node.x, node.y].every(Number.isFinite)) return;
    element.setAttribute('transform', `translate(${node.x},${node.y})`);
    syncFornacDirectionArrow(element, node);
  });
  cache.links.forEach(element => {
    const link = element.__data__;
    if (!link?.source || !link?.target) return;
    element.setAttribute('x1', String(link.source.x));
    element.setAttribute('y1', String(link.source.y));
    element.setAttribute('x2', String(link.target.x));
    element.setAttribute('y2', String(link.target.y));
  });
}
