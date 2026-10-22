import { createRnaGraph } from '../src/core/canvas/graph/structure.js';
import { simpleXyCoordinates } from '../src/core/canvas/graph/coordinates.js';
import { relaxForceGraphScaffold } from '../src/core/canvas/layout/scaffold.js';
import { legacyGraph } from './helpers/legacy-graph.js';

function constraints(graph) {
  const id = node => node.nodeType === 'nucleotide' ? `n${node.num}` :
    node.num === -1 ? `hub:${node.nucs.join(',')}` : `closure:${node.num}`;
  return graph.links.filter(link => ['fake', 'fake_fake'].includes(link.linkType))
    .map(link => ({ key: `${link.linkType}:${id(link.source)}:${id(link.target)}`, value: link.value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

test.each(['(((...)))', '..(((...)))...', '((..((....))..))', '..((..))..((...))..', '....'])
('hidden constraints match the pinned Fornac graph for %s', async structure => {
  const graph = createRnaGraph(structure, { sequence: 'A'.repeat(structure.length), labelInterval: 0 });
  const legacy = await legacyGraph(structure, simpleXyCoordinates(graph.pairtable));
  const actual = constraints(graph), expected = constraints(legacy);
  expect(actual.map(link => link.key)).toEqual(expected.map(link => link.key));
  actual.forEach((link, index) => expect(link.value).toBeCloseTo(expected[index].value, 3));
});

test('the strand gap has exactly two virtual vertices in coordinates and forces', () => {
  const graph = createRnaGraph('((..&..))', { sequence: 'AAAA&UUUU', labelInterval: 0 });
  const virtual = graph.nodes.filter(node => node.layoutRole === 'strand-break');
  expect(virtual).toHaveLength(2);
  expect(graph.rnaLength).toBe(8);
  expect(graph.pairtable).toEqual([8, 8, 7, 0, 0, 0, 0, 2, 1]);
  const layout = createRnaGraph('((......))', { sequence: 'A'.repeat(10), labelInterval: 0 });
  const order = [...graph.nodes.slice(0, 4), ...virtual, ...graph.nodes.slice(4, 8)];
  expect(order.map(({ x, y }) => [x, y])).toEqual(layout.nodes.slice(0, 10).map(({ x, y }) => [x, y]));
  // Every virtual position participates in the same hidden springs as a loop vertex.
  virtual.forEach(node => expect(graph.links.some(link => link.source === node && link.linkType === 'fake')).toBe(true));
  expect(graph.nodes.some(node => node.scaffoldType === 'exterior' && node.nucs?.length === 8)).toBe(true);
});

test('free ends remove virtual vertices and exterior springs, preserving interior constraints', () => {
  const graph = createRnaGraph('..((..))..((..&..))..', { sequence: 'A'.repeat(14) + '&' + 'U'.repeat(6) });
  const retained = graph.nodes.filter(node => node.nodeType === 'nucleotide' ||
    node.nodeType === 'label' || node.scaffoldType !== 'exterior');
  const interiorUids = new Set(retained.map(node => node.uid));
  const interiorLinks = graph.links.filter(link => link.scaffoldUid && interiorUids.has(link.scaffoldUid));
  expect(relaxForceGraphScaffold({ graph })).toBe(true);
  expect(graph.nodes).toEqual(retained);
  expect(graph.links).toEqual(expect.arrayContaining(interiorLinks));
  expect(graph.links.every(link => graph.nodes.includes(link.source) && graph.nodes.includes(link.target))).toBe(true);
  expect(relaxForceGraphScaffold({ graph })).toBe(false);
});
