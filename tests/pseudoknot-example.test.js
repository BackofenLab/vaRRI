import { JSDOM } from 'jsdom';
import { createRnaGraph } from '../src/core/canvas/graph/structure.js';
import { createGraphCanvas } from '../src/core/canvas/graph/index.js';
import { createVaRRI } from '../src/core/index.js';
import { applyPseudoknotLinkStrength, relaxForceGraphScaffold } from '../src/core/canvas/layout/scaffold.js';
import examples from '../example-data.js';

const input = () => createVaRRI().validate(examples['crossing-rri'].vaRRIParams);
const makeGraph = structure => createRnaGraph(structure, {
  sequence: structure.replaceAll(/[^&]/g, 'A'), labelInterval: 0,
});

function constraints(graph, generatedOnly = false) {
  const id = node => node.nodeType === 'nucleotide' ? `n${node.num}` :
    `${node.scaffoldType}:${node.nucs.join(',')}`;
  return graph.links.filter(link => ['fake', 'fake_fake'].includes(link.linkType) &&
    (!generatedOnly || link.pseudoknotScaffold))
    .map(link => ({ key: [link.linkType, ...[id(link.source), id(link.target)].sort()].join('|'),
      value: link.value })).sort((a, b) => a.key.localeCompare(b.key));
}

test('the crossing example has the complete scaffold of the equivalent ordinary helix', () => {
  const v = input();
  const graph = makeGraph(v.structure);
  const container = { graph, linkStrengths: {} };
  relaxForceGraphScaffold(container);
  applyPseudoknotLinkStrength(container, true);
  // Remove the competing pairs: the same upper helix now uses normal Fornac
  // stem/interior-loop classification and scaffold construction.
  const ordinary = { graph: makeGraph('((..((...........&)))).........') };
  relaxForceGraphScaffold(ordinary);
  expect(constraints(graph, true)).toEqual(constraints(ordinary.graph));
  expect(graph.nodes.filter(node => node.pseudoknotScaffold).map(node => node.scaffoldType).sort())
    .toEqual(['interior', 'stem', 'stem']);
});

test.each([
  ['((..[.[..))..].]', [5, 6, 7, 14, 15, 16]],
  ['((..[[..))..].]', [5, 6, 13, 14, 15]],
])('%s preserves bulge/interior-loop nucleotides in their own scaffold', (structure, members) => {
  const graph = makeGraph(structure);
  applyPseudoknotLinkStrength({ graph, linkStrengths: {} }, true);
  const hubs = graph.nodes.filter(node => node.pseudoknotScaffold);
  expect(hubs).toHaveLength(1);
  expect(hubs[0].scaffoldType).toBe('interior');
  expect(hubs[0].nucs).toEqual(members);
});

test.each(['((..[&.[..))..].]', '((..[.[..))..]&.]', '((..[.[..))..]&]'])
('%s never closes an interior polygon across a strand break', structure => {
  const graph = makeGraph(structure);
  applyPseudoknotLinkStrength({ graph, linkStrengths: {} }, true);
  expect(graph.nodes.some(node => node.pseudoknotScaffold)).toBe(false);
});

function maximumAngleError(graph, quads) {
  return Math.max(...quads.flatMap(nums => {
    const points = nums.map(num => graph.nodes.find(node => node.num === num && node.nodeType === 'nucleotide'));
    return points.map((node, index) => {
      const a = points[(index + 3) % 4], b = points[(index + 1) % 4];
      const cosine = ((a.x - node.x) * (b.x - node.x) + (a.y - node.y) * (b.y - node.y)) /
        (Math.hypot(a.x - node.x, a.y - node.y) * Math.hypot(b.x - node.x, b.y - node.y));
      return Math.abs(90 - Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI);
    });
  }));
}

test.each(['before', 'after'])('the full labeled example stabilizes both upper stacks with free ends %s pulling', order => {
  const dom = new JSDOM('<div></div>');
  const canvas = createGraphCanvas(dom.window.document.querySelector('div'));
  try {
    const v = input();
    const graph = canvas.addRNA(v.structure, { sequence: v.sequence });
    if (order === 'before') relaxForceGraphScaffold(canvas);
    applyPseudoknotLinkStrength(canvas, true);
    if (order === 'after') relaxForceGraphScaffold(canvas);
    canvas.force.start();
    for (let tick = 0; tick < 400; tick++) canvas.force.tick();
    const upper = maximumAngleError(graph, [[1, 2, 20, 21], [5, 6, 18, 19]]);
    const lower = maximumAngleError(graph, [[10, 11, 29, 30], [11, 12, 28, 29],
      [15, 16, 26, 27], [16, 17, 25, 26]]);
    expect(upper).toBeLessThan(12);
    expect(upper).toBeLessThan(lower + 2);
    expect(graph.nodes.every(node => [node.x, node.y, node.px, node.py].every(Number.isFinite))).toBe(true);
    expect(graph.links.every(link => graph.nodes.includes(link.source) && graph.nodes.includes(link.target))).toBe(true);
  } finally { canvas.destroy(); dom.window.close(); }
});
