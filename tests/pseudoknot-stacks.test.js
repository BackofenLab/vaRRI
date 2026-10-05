import { JSDOM } from 'jsdom';
import { createRnaGraph } from '../src/core/canvas/graph/structure.js';
import { createGraphCanvas } from '../src/core/canvas/graph/index.js';
import { createSimulation } from '../src/core/canvas/graph/simulation.js';
import getD3 from '../src/core/vendor/d3.js';
import { applyPseudoknotLinkStrength, relaxForceGraphScaffold } from '../src/core/canvas/layout/scaffold.js';

const structure = '((..[[..))..]]';
const makeGraph = value => createRnaGraph(value, {
  sequence: value.replaceAll(/[^&]/g, 'A'), labelInterval: 0,
});
const diagonals = graph => graph.links.filter(link => link.linkType === 'pseudoknot_scaffold');
const activate = graph => applyPseudoknotLinkStrength({ graph, linkStrengths: {} }, true);

test('crossing stacks receive the same reciprocal diagonals as ordinary stem rectangles', () => {
  const graph = makeGraph(structure);
  const originalLinks = [...graph.links], originalNodes = [...graph.nodes];
  expect(diagonals(graph)).toHaveLength(0);
  activate(graph);
  const hidden = diagonals(graph);
  expect(hidden.map(link => [link.source.num, link.target.num]).sort()).toEqual(
    [[5, 13], [13, 5], [6, 14], [14, 6]].sort());
  const ordinary = graph.links.filter(link => link.linkType === 'fake' &&
    link.source.nodeType === 'nucleotide' && link.target.nodeType === 'nucleotide' &&
    [1, 2, 9, 10].includes(link.source.num) && [1, 2, 9, 10].includes(link.target.num));
  expect(ordinary).toHaveLength(4);
  hidden.forEach((link, index) => expect(link.value).toBeCloseTo(ordinary[index].value, 12));
  expect(graph.nodes).toEqual(originalNodes);
  expect(graph.links.filter(link => link.linkType !== 'pseudoknot_scaffold')).toEqual(originalLinks);
});

test.each([
  ['(((...[[[)))...]]]', 8],
  ['((..&[[..))..]]', 4],
  ['((..[[..))&..]]', 4],
  ['((..[&[..))..]]', 0],
  ['((..[[..))..]&]', 0],
  ['((..[.[..))..].]', 0],
  ['((..[[..))..].]', 0],
  ['([..)]', 0],
  ['(((...)))', 0],
])('%s respects contiguous stacks and strand boundaries', (value, count) => {
  const graph = makeGraph(value);
  activate(graph);
  expect(diagonals(graph)).toHaveLength(count);
  expect(new Set(graph.links.map(link => link.uid)).size).toBe(graph.links.length);
});

test.each(['before', 'after'])('free-end cleanup %s pulling preserves stack constraints', order => {
  const container = { graph: makeGraph(structure), linkStrengths: {} };
  if (order === 'before') relaxForceGraphScaffold(container);
  applyPseudoknotLinkStrength(container, true);
  if (order === 'after') relaxForceGraphScaffold(container);
  expect(diagonals(container.graph)).toHaveLength(4);
  expect(container.graph.links.every(link =>
    container.graph.nodes.includes(link.source) && container.graph.nodes.includes(link.target))).toBe(true);
});

test('toggling refreshes the live simulation without duplicate springs or visible edges', () => {
  const dom = new JSDOM('<div id="rna"></div>');
  const canvas = createGraphCanvas(dom.window.document.getElementById('rna'), { labelInterval: 0 });
  try {
    const graph = canvas.addRNA(structure, { sequence: 'A'.repeat(structure.length) });
    const originalLinks = [...graph.links];
    const visibleCount = canvas.element.querySelectorAll('line').length;
    for (let repeat = 0; repeat < 2; repeat++) {
      applyPseudoknotLinkStrength(canvas, true);
      applyPseudoknotLinkStrength(canvas, true);
      expect(diagonals(graph)).toHaveLength(4);
      expect(canvas.force.links()).toBe(graph.links);
      canvas.update();
      expect(canvas.element.querySelectorAll('line')).toHaveLength(visibleCount);
      for (let tick = 0; tick < 400; tick++) canvas.force.tick();
      expect(graph.nodes.every(node => [node.x, node.y, node.px, node.py].every(Number.isFinite))).toBe(true);
      applyPseudoknotLinkStrength(canvas, false);
      expect(canvas.linkStrengths.pseudoknot).toBe(0);
      expect(graph.links).toEqual(originalLinks);
      expect(canvas.force.links()).toBe(graph.links);
    }
  } finally { canvas.destroy(); dom.window.close(); }
});

// Isolate a skewed stack so unrelated loop forces cannot hide a floppy
// parallelogram. Pair/backbone springs alone cannot correct its angles.
function settleStack(stabilize) {
  const dom = new JSDOM('<div></div>');
  const graph = makeGraph(structure);
  const corners = [5, 6, 13, 14].map(num => graph.nodes[num - 1]);
  const positions = [[0, 0], [15, 0], [27, 9], [12, 9]];
  graph.nodes = corners;
  graph.links = graph.links.filter(link => ['backbone', 'pseudoknot'].includes(link.linkType) &&
    corners.includes(link.source) && corners.includes(link.target));
  corners.forEach((node, index) => {
    [node.x, node.y] = positions[index];
    node.px = node.x;
    node.py = node.y;
  });
  const container = { graph, options: { friction: 0.35, middleCharge: 0, otherCharge: 0,
    chargeDistance: 110, linkDistanceMultiplier: 15 }, linkStrengths: { other: 10, pseudoknot: 10 } };
  const force = createSimulation(container, getD3(dom.window.document));
  container.force = force;
  force.nodes(graph.nodes).links(graph.links);
  if (stabilize) applyPseudoknotLinkStrength(container, true);
  else force.start();
  try {
    for (let tick = 0; tick < 400; tick++) force.tick();
    const [a, b, c, d] = corners;
    const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);
    return { sides: [[a, b], [b, c], [c, d], [d, a]].map(([x, y]) => distance(x, y)),
      diagonals: [distance(a, c), distance(b, d)] };
  } finally { force.stop(); dom.window.close(); }
}

test('hidden diagonals straighten a skewed pseudoknot stack into a rectangle', () => {
  const before = settleStack(false), after = settleStack(true);
  expect(Math.abs(before.diagonals[0] - before.diagonals[1])).toBeGreaterThan(10);
  after.sides.forEach(length => expect(length).toBeCloseTo(15, 1));
  after.diagonals.forEach(length => expect(length).toBeCloseTo(15 * Math.SQRT2, 1));
});
