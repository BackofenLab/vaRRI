import { JSDOM } from 'jsdom';
import { createGraphCanvas } from '../src/core/canvas/graph/index.js';
import { createVaRRI } from '../src/core/index.js';
import examples from '../example-data.js';

const radius = nodes => {
  const x = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
  const y = nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;
  return nodes.reduce((sum, node) => sum + Math.hypot(node.x - x, node.y - y), 0) / nodes.length;
};

test('all-in-one retains both exterior loop radii with ordinary force layout', () => {
  const dom = new JSDOM('<div id="rna"></div>');
  const container = createGraphCanvas(dom.window.document.getElementById('rna'));
  try {
    const v = createVaRRI().validate(examples['2mol'].vaRRIParams);
    const graph = container.addRNA(v.structure, { sequence: v.sequence });
    const loops = graph.nodes.filter(node => node.num === -1 && node.scaffoldType === 'exterior')
      .map(hub => hub.nucs.map(index => graph.nodes[index - 1]).filter(node => node.nodeType === 'nucleotide'));
    expect(loops).toHaveLength(2);
    const initial = loops.map(radius);
    container.force.start();
    for (let tick = 0; tick < 400; tick++) container.force.tick();
    container.force.stop();
    loops.forEach((nodes, index) => {
      expect(radius(nodes) / initial[index]).toBeGreaterThan(0.85);
      expect(radius(nodes) / initial[index]).toBeLessThan(1.15);
    });
    expect(graph.nodes.every(node => [node.x, node.y, node.px, node.py].every(Number.isFinite))).toBe(true);
    expect(container.element.querySelectorAll('circle[node_type="nucleotide"]')).toHaveLength(graph.rnaLength);
    expect(container.element.querySelectorAll('circle[node_type="middle"]')).toHaveLength(0);
  } finally {
    container.destroy();
    dom.window.close();
  }
});
