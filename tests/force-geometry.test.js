import { JSDOM } from 'jsdom';
import { createGraphCanvas } from '../src/core/canvas/graph/index.js';
import { createVaRRI } from '../src/core/index.js';
import examples from '../example-data.js';
import { relaxForceGraphScaffold, applyPseudoknotLinkStrength } from '../src/core/canvas/layout/scaffold.js';
import { clearLinearHelixConstraintState } from '../src/core/canvas/layout/linear-helix.js';

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

test.each(Object.keys(examples).flatMap(name => ['ordinary', 'linear', 'free-crossing'].map(mode => [name, mode])))
('%s converges with %s forces and preserves the nucleotide graph', (name, mode) => {
  const dom = new JSDOM('<div id="rna"></div>');
  const root = dom.window.document.getElementById('rna');
  const api = createVaRRI({ root });
  const container = createGraphCanvas(root);
  try {
    const v = api.validate(examples[name].vaRRIParams);
    const graph = container.addRNA(v.structure, { sequence: v.sequence });
    if (mode === 'linear') api.applyLinearHelixSprings(container, v, { rri: true, structure: true });
    if (mode === 'free-crossing') {
      relaxForceGraphScaffold(container);
      applyPseudoknotLinkStrength(container, true);
    }
    container.force.start();
    for (let tick = 0; tick < 400; tick++) container.force.tick();
    expect(container.force.alpha()).toBeLessThan(0.005);
    expect(graph.nodes.every(node => [node.x, node.y, node.px, node.py].every(Number.isFinite))).toBe(true);
    expect(graph.nodes.filter(node => node.nodeType === 'nucleotide')).toHaveLength(graph.rnaLength);
    expect(graph.links.every(link => graph.nodes.includes(link.source) && graph.nodes.includes(link.target))).toBe(true);
    for (const template of container.varriLinearHelixTemplates || []) {
      for (const [a, b] of template.pairs) {
        const first = graph.nodes[a - 1], second = graph.nodes[b - 1];
        expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeCloseTo(15, 6);
      }
    }
  } finally {
    clearLinearHelixConstraintState(container);
    container.destroy();
    dom.window.close();
  }
});
