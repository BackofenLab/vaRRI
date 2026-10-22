import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { createVaRRI } from '../src/core/index.js';
import { createGraphCanvas } from '../src/core/canvas/graph/index.js';

const rriPairs = [[1, 10], [2, 9], [5, 6]];
const stemPairs = [[1, 12], [2, 11], [5, 8]];
const fixtures = [
  ['RRI', '((..(&)..))', true, false, [rriPairs]],
  ['stem', '((..(..)..))', false, true, [stemPairs]],
  ['both', '((..(&)..))((..(..)..))', true, true,
    [rriPairs, stemPairs.map(pair => pair.map(n => n + 10))]],
  ['unpaired', '....&....', true, true, []],
  ['crossing RRI', '([&)]', true, true, []],
];

const positions = container => container.graph.nodes.map(({ x, y, px, py }) => [x, y, px, py]);

function expectRails(nodes, pairs, horizontal) {
  const columns = pairs.map(pair => pair.map(n => nodes.find(node => node.num === n)));
  const centers = columns.map(([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }));
  const axis = { x: centers.at(-1).x - centers[0].x, y: centers.at(-1).y - centers[0].y };
  const length = Math.hypot(axis.x, axis.y);
  expect(length).toBeGreaterThan(1);
  if (horizontal) expect(Math.abs(axis.y)).toBeLessThan(1e-6);
  for (const [index, [a, b]] of columns.entries()) {
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(15, 6);
    expect(((a.x - b.x) * axis.x + (a.y - b.y) * axis.y) / length).toBeCloseTo(0, 6);
    const center = centers[index];
    expect(((center.x - centers[0].x) * axis.y - (center.y - centers[0].y) * axis.x) / length).toBeCloseTo(0, 6);
  }
}

test.each(fixtures)('%s linear layout settles, renders, and stays stopped without Force layout',
  async (_name, structure, rri, stem, groups) => {
    const dom = new JSDOM('<div id="rna"></div>', { pretendToBeVisual: true });
    let container;
    const api = createVaRRI({ document: dom.window.document,
      createCanvas(root, options) { container = createGraphCanvas(root, options); return container; } });
    const animation = jest.spyOn(dom.window, 'requestAnimationFrame');
    try {
      const v = api.validate({ sequence: structure.replace(/[^&]/g, 'A'), structure });
      await api.render('rna', v, { forceLayout: false,
        forceLayoutLinearRRI: rri, forceLayoutLinearStructure: stem });
      expect(container.options.animation).toBe(false);
      expect(container.force.alpha()).toBe(0);
      expect(container.force.on('tick.varriLinearHelix')).toBeUndefined();
      expect(container.force.on('end.varriLinearHelix')).toBeUndefined();
      expect(container.graph.nodes.every(node => !node.fixed)).toBe(true);
      expect(positions(container).flat().every(Number.isFinite)).toBe(true);
      expect(container.element.querySelectorAll('circle[node_type="nucleotide"]'))
        .toHaveLength(structure.replace('&', '').length);
      groups.forEach((pairs, index) => expectRails(container.graph.nodes, pairs, rri && index === 0));
      const snapshot = positions(container);
      animation.mockClear();
      await new Promise(resolve => setTimeout(resolve, 80));
      expect(positions(container)).toEqual(snapshot);
      expect(animation).not.toHaveBeenCalled();
      const exported = api.buildSVGString('rna');
      expect(exported).toContain('<svg');
      expect(exported).not.toContain('NaN');
    } finally { api.cancelActiveRender(); dom.window.close(); }
  });

test('static linear rendering can be cancelled and replaced by an ordinary static layout', async () => {
  const dom = new JSDOM('<div id="rna"></div>');
  const containers = [];
  const api = createVaRRI({ document: dom.window.document, createCanvas(root, options) {
    const container = createGraphCanvas(root, options); containers.push(container); return container;
  } });
  try {
    const v = api.validate({ sequence: 'AAAAA&UUUUU', structure: '((..(&)..))' });
    const pending = api.render('rna', v, { forceLayoutLinearRRI: true });
    const replacement = api.render('rna', v);
    await expect(pending).resolves.toEqual({ cancelled: true });
    await expect(replacement).resolves.toEqual({ cancelled: false });
    expect(containers[0].destroyed).toBe(true);
    expect(containers.every(container => container.force.alpha() === 0)).toBe(true);
    expect(containers[1].graph.nodes.some(node => node.varriLinearHelix)).toBe(false);
    expect(dom.window.document.querySelectorAll('#rna svg')).toHaveLength(1);
  } finally { api.cancelActiveRender(); dom.window.close(); }
});
