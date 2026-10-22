import { createRnaGraph } from '../src/core/canvas/graph/structure.js';
import { findBasePairs } from '../src/core/model/brackets.js';

describe('RNA graph preserves strand boundaries without synthetic nucleotides', () => {
  test.each([
    ['A', '.'],
    ['AU', '()'],
    ['A&U', '(&)'],
    ['AAAA&UUUU', '((..&..))'],
    ['ACGU&UGCA', '[((.&])).'],
    ['AAAA&UUUU', '....&....'],
    ['ACGUACGU', '((....))'],
  ])('%s has one real node per nucleotide', (sequence, structure) => {
    const graph = createRnaGraph(structure, { sequence });
    const nucleotides = graph.nodes.filter(node => node.nodeType === 'nucleotide');
    const bare = sequence.replaceAll('&', '');
    expect(nucleotides.map(node => node.num)).toEqual(Array.from(bare, (_, index) => index + 1));
    expect(nucleotides.map(node => node.name).join('')).toBe(bare);
    expect(nucleotides.every(node => [node.x, node.y, node.px, node.py].every(Number.isFinite))).toBe(true);

    const backbone = graph.links.filter(link => link.linkType === 'backbone');
    expect(backbone).toHaveLength(bare.length - sequence.split('&').length);
    expect(backbone.every(link => link.target.num === link.source.num + 1)).toBe(true);
    expect(backbone.every(link => !graph.breaks.includes(link.source.num))).toBe(true);
    for (const boundary of graph.breaks) {
      expect(nucleotides[boundary - 1].nextNode).toBeNull();
      expect(nucleotides[boundary].prevNode).toBeNull();
    }

    const pairs = graph.links.filter(link => ['basepair', 'pseudoknot'].includes(link.linkType));
    const expected = findBasePairs(structure.replaceAll('&', '')).map(([a, b]) => `${a + 1}:${b + 1}`).sort();
    expect(pairs.map(link => `${link.source.num}:${link.target.num}`).sort()).toEqual(expected);
    expect(new Set(pairs.map(link => link.uid)).size).toBe(pairs.length);
    expect(graph.links.every(link => graph.nodes.includes(link.source) && graph.nodes.includes(link.target))).toBe(true);
  });

  test('retains crossing pairs separately from the planar layout scaffold', () => {
    const graph = createRnaGraph('([..&.)].', { sequence: 'AAAA&UUUU' });
    const links = graph.links.filter(link => ['basepair', 'pseudoknot'].includes(link.linkType));
    expect(links).toHaveLength(2);
    expect(links.filter(link => link.linkType === 'pseudoknot')).toHaveLength(1);
    expect(graph.nodes.filter(node => node.nodeType === 'middle').every(node => node.scaffoldType)).toBe(true);
  });

  test('rejects absent or mismatched nucleotide data before building a graph', () => {
    expect(() => createRnaGraph('....', { sequence: 'AA' })).toThrow(/same nonzero length/);
    expect(() => createRnaGraph('', { sequence: '' })).toThrow(/same nonzero length/);
  });
});
