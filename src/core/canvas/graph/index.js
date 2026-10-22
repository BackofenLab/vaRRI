import getD3 from '../../vendor/d3.js';
import { createRnaGraph } from './structure.js';
import { createSvg, updateSvg, syncPositions } from './svg.js';
import { createForce } from './force.js';
import { createCanvasInteractions } from '../interactions.js';
import { INTERACTION_TARGET } from '../interaction-selection.js';

const DEFAULT_OPTIONS = {
  animation: false, labelInterval: 1, chargeDistance: 110, friction: 0.35,
  middleCharge: -30, otherCharge: -30, linkDistanceMultiplier: 15,
  maxNodeRadius: 80, zoomable: true,
};

/**
 * A small, instance-local D3 canvas. Importing this module does not access a DOM.
 * All RNA/force objects are ordinary JavaScript objects; keep them out of Vue
 * reactive state. Compatibility attributes support vaRRI's annotation layers.
 */
export function createGraphCanvas(target, options = {}) {
  const element = typeof target === 'string' ? globalThis.document?.querySelector(target) : target;
  if (!element) throw new Error(`RNA canvas target was not found: ${target}`);
  const d3 = getD3(element.ownerDocument);
  const layers = createSvg(element);
  const container = {
    element, layers, svg: layers.svg, plot: layers.plot,
    destroyed: false,
    options: { ...DEFAULT_OPTIONS, ...options }, graph: { nodes: [], links: [] },
    linkStrengths: { pseudoknot: 0, intermolecule: 10, external: 0, other: 10 },
  };
  let destroyed = false;
  const svg = d3.select(layers.svg);
  const plot = d3.select(layers.plot);
  const zoom = d3.zoom().filter(event => !event.button && ((event.type === 'wheel' && !event.ctrlKey && !event.metaKey) ||
    (event.type !== 'wheel' && !event.ctrlKey && !event.metaKey && !event.target.closest?.(INTERACTION_TARGET))))
    .on('start.graph', event => {
    const source = event.sourceEvent;
    if (source?.type !== 'mousedown' || !source.view) return;
    container.cancelZoom = () => {
      d3.select(source.view).on('mousemove.zoom mouseup.zoom', null);
      d3.dragEnable(source.view);
      container.cancelZoom = null;
    };
  }).on('end.graph', () => { container.cancelZoom = null; }).on('zoom.graph', event => {
    if (destroyed) return;
    const { x, y, k } = event.transform;
    plot.attr('transform', `translate(${x},${y}) scale(${k})`);
    container.interactions?.refresh();
  });
  if (container.options.zoomable) svg.call(zoom);

  function sizeCanvas() {
    const width = options.initialSize?.[0] || element.clientWidth || 300;
    const height = options.initialSize?.[1] || element.clientHeight || 300;
    container.options.svgW = width;
    container.options.svgH = height;
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    d3.select(layers.background).attr('width', width).attr('height', height);
    zoom.extent([[0, 0], [width, height]]);
  }
  sizeCanvas();
  container.force = createForce(container, d3);
  container.interactions = createCanvasInteractions(container, () => {
    syncPositions(container, d3);
    container.onManualMove?.();
  });
  container.centerView = () => {
    if (destroyed || !container.graph.nodes.length) return;
    const nodes = container.graph.nodes.filter(node => Number.isFinite(node.x) && Number.isFinite(node.y));
    if (!nodes.length) return;
    const minX = d3.min(nodes, node => node.x), maxX = d3.max(nodes, node => node.x);
    const minY = d3.min(nodes, node => node.y), maxY = d3.max(nodes, node => node.y);
    const maxRadius = Math.max(1, d3.max(nodes, node => node.radius));
    const { svgW, svgH, maxNodeRadius } = container.options;
    const scale = Math.min(svgW / (maxX - minX + 1), svgH / (maxY - minY + 1),
      maxNodeRadius / maxRadius) * 0.8;
    const translate = [svgW / 2 - (minX + maxX) * scale / 2,
      svgH / 2 - (minY + maxY) * scale / 2];
    svg.call(zoom.transform, d3.zoomIdentity.translate(...translate).scale(scale));
  };
  container.update = () => {
    if (destroyed) return;
    container.force.nodes(container.graph.nodes).links(container.graph.links);
    updateSvg(container, d3);
    container.interactions.refresh();
    if (container.options.animation) container.force.start();
  };
  container.addRNA = (structure, rnaOptions = {}) => {
    if (destroyed) throw new Error('Cannot add RNA to a destroyed canvas.');
    container.interactions.clear();
    container.force.stop();
    container.hasManualPositions = false;
    container.graph = createRnaGraph(structure, {
      labelInterval: container.options.labelInterval, ...rnaOptions,
    });
    container.update();
    container.centerView();
    return container.graph;
  };
  const ResizeObserver = element.ownerDocument.defaultView?.ResizeObserver;
  const observer = ResizeObserver ? new ResizeObserver(() => {
    if (destroyed) return;
    sizeCanvas();
    container.centerView();
  }) : null;
  observer?.observe(element);
  container.destroy = () => {
    if (destroyed) return;
    destroyed = true;
    container.destroyed = true;
    container.interactions.dispose();
    delete container.onManualMove;
    container.cancelZoom?.();
    observer?.disconnect();
    container.force.on('tick.graph', null).on('end.graph', null).stop();
    svg.on('.zoom', null);
  };
  return container;
}
