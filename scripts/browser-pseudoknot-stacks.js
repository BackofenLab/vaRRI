import assert from 'node:assert/strict';

/** Exercise the public render option in both native source and the bundle. */
export async function exercisePseudoknotStacks(page) {
  const results = await page.evaluate(async () => {
    const api = window.exportApi;
    const structure = '((..[[..))..]]';
    const input = api.validate({ sequence: 'A'.repeat(structure.length), structure,
      highlighting: 'nothing', backgroundhighlighting: 'nothing' });
    const results = [];
    for (const options of [
      { forceLayout: false, pullPseudoknotBasepairs: true },
      { forceLayout: true, pullPseudoknotBasepairs: false },
      { forceLayout: true, pullPseudoknotBasepairs: true },
      { forceLayout: true, pullPseudoknotBasepairs: true, freeTrailingEnds: true },
      { forceLayout: true, pullPseudoknotBasepairs: false },
    ]) {
      await api.render('second', input, options);
      const element = document.getElementById('second');
      const graph = element.querySelector('circle[node_type="nucleotide"]').__data__.rna;
      const visibleLinks = [...element.querySelectorAll('line.link')].map(line => line.__data__);
      const svg = new DOMParser().parseFromString(api.buildSVGString('second'), 'image/svg+xml');
      results.push({
        hidden: graph.links.filter(link => link.pseudoknotScaffold &&
          link.source.nodeType === 'nucleotide' && link.target.nodeType === 'nucleotide').length,
        hubs: graph.nodes.filter(node => node.pseudoknotScaffold).length,
        visibleHidden: visibleLinks.some(link => link.pseudoknotScaffold),
        exportedHidden: svg.querySelectorAll('[link_type="fake"], [link_type="fake_fake"], [node_type="middle"]').length,
        nucleotides: element.querySelectorAll('circle[node_type="nucleotide"]').length,
        pairs: visibleLinks.filter(link => ['basepair', 'pseudoknot'].includes(link.linkType)).length,
        finite: graph.nodes.every(node => [node.x, node.y, node.px, node.py].every(Number.isFinite)),
      });
      api.cancelActiveRender();
    }
    return results;
  });
  assert.deepEqual(results.map(result => result.hidden), [0, 0, 4, 4, 0],
    'Only animated pulling activates stacked pseudoknot constraints, including with free ends');
  assert.deepEqual(results.map(result => result.hubs), [0, 0, 1, 1, 0],
    'Stack hubs follow the pull option without leaking across renders');
  for (const result of results) {
    assert.equal(result.visibleHidden, false, 'Diagonal springs remain hidden on the canvas');
    assert.equal(result.exportedHidden, 0, 'Diagonal springs remain hidden in SVG exports');
    assert.equal(result.nucleotides, 14, 'All real nucleotides remain visible');
    assert.equal(result.pairs, 4, 'Each real base pair remains visible exactly once');
    assert.equal(result.finite, true, 'Activated stack forces have finite coordinates');
  }
}
