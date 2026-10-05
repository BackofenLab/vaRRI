const SVG_NS = 'http://www.w3.org/2000/svg';
const LOOP_COLORS = { s: 'lightgreen', m: '#ff9896', i: '#dbdb8d',
  e: 'lightsalmon', t: 'lightcyan', h: 'lightblue' };

export function createSvg(element) {
  const document = element.ownerDocument;
  const make = (tag, className, parent) => {
    const node = document.createElementNS(SVG_NS, tag);
    if (className) node.setAttribute('class', className);
    parent.appendChild(node);
    return node;
  };
  element.replaceChildren();
  const svg = make('svg', 'fornac-svg', element);
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'RNA secondary structure');
  const background = make('rect', 'background', svg);
  background.setAttribute('fill', 'transparent');
  const plot = make('g', 'fornac-plot', svg);
  const links = make('g', 'fornac-links', plot);
  const nodes = make('g', 'fornac-nodes', plot);
  return { svg, background, plot, links, nodes };
}

function directionArrow(node) {
  const previous = node.prevNode;
  if (!previous || !node.linked) return '';
  const length = Math.hypot(previous.x - node.x, previous.y - node.y);
  if (!length) return '';
  const dx = (previous.x - node.x) / length;
  const dy = (previous.y - node.y) / length;
  const x = (node.radius + 0.4) * dx;
  const y = (node.radius + 0.4) * dy;
  return `M${x + 3 * dx - 2.1 * dy},${y + 3 * dy + 2.1 * dx}` +
    `L${x},${y}L${x + 3 * dx + 2.1 * dy},${y + 3 * dy - 2.1 * dx}`;
}

export function syncPositions(container, d3) {
  d3.select(container.layers.links).selectAll('line.link')
    .attr('x1', link => link.source.x).attr('y1', link => link.source.y)
    .attr('x2', link => link.target.x).attr('y2', link => link.target.y);
  const groups = d3.select(container.layers.nodes).selectAll('g.gnode');
  groups.attr('transform', node => `translate(${node.x},${node.y})`);
  groups.select('path.fornac-directionArrow').attr('d', directionArrow);
}

/** Join only visible objects. Geometric force hubs never enter the SVG. */
export function updateSvg(container, d3) {
  const visibleLinks = container.graph.links.filter(link =>
    !['fake', 'fake_fake', 'varri_linear_helix'].includes(link.linkType));
  const links = d3.select(container.layers.links).selectAll('line.link')
    .data(visibleLinks, link => link.uid);
  const newLinks = links.enter().append('line').attr('class', 'link fornac-link')
    .attr('link_type', link => link.linkType)
    .attr('start', link => link.source.num).attr('end', link => link.target.num);
  newLinks.append('title').text(link => `${link.linkType}:${link.source.num}-${link.target.num}`);
  links.exit().remove();
  const visibleNodes = container.graph.nodes.filter(node =>
    node.nodeType === 'nucleotide' || node.nodeType === 'label');
  const nodes = d3.select(container.layers.nodes).selectAll('g.gnode')
    .data(visibleNodes, node => node.uid);
  const groups = nodes.enter().append('g').attr('class', 'gnode')
    .attr('num', node => `n${node.num}`).attr('struct_name', node => node.structName);
  const nucleotides = groups.filter(node => node.nodeType === 'nucleotide');
  nucleotides.append('path').attr('class', 'fornac-directionArrow')
    .attr('node_num', node => node.num);
  groups.append('circle').attr('class', 'fornac-node')
    .attr('node_type', node => node.nodeType).attr('node_num', node => node.num)
    .attr('r', node => node.radius)
    .style('fill', node => node.nodeType === 'nucleotide' ? LOOP_COLORS[node.elemType] : 'white')
    .append('title').text(node => `${node.structName}:${node.num}`);
  groups.append('text').attr('class', 'fornac-nodeLabel')
    .attr('label_type', node => node.nodeType).text(node => node.name);
  nodes.exit().remove();
  syncPositions(container, d3);
  return groups;
}
