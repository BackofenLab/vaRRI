import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/** Reproduce Martin's review through the actual example selector and defaults. */
export async function checkCrossingRriExample(page, output) {
  await page.waitForFunction(() => {
    const graph = document.querySelector('#rendering-canvas circle[node_type="nucleotide"]')?.__data__.rna;
    if (graph?.dotbracket !== '((..((...<<<..<<<))))...>>>>>>') return false;
    const positions = graph.nodes.map(node => `${node.x}:${node.y}`).join('|');
    const previous = window.crossingRriRest;
    if (previous?.positions !== positions) {
      window.crossingRriRest = { positions, since: performance.now() };
      return false;
    }
    return performance.now() - previous.since > 350;
  }, null, { timeout: 15000 });
  const result = await page.evaluate(() => {
    delete window.crossingRriRest;
    const element = document.getElementById('rendering-canvas');
    const graph = element.querySelector('circle[node_type="nucleotide"]').__data__.rna;
    const error = quads => Math.max(...quads.flatMap(nums => {
      const points = nums.map(num => graph.nodes.find(node => node.nodeType === 'nucleotide' && node.num === num));
      return points.map((node, index) => {
        const a = points[(index + 3) % 4], b = points[(index + 1) % 4];
        const cosine = ((a.x - node.x) * (b.x - node.x) + (a.y - node.y) * (b.y - node.y)) /
          (Math.hypot(a.x - node.x, a.y - node.y) * Math.hypot(b.x - node.x, b.y - node.y));
        return Math.abs(90 - Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI);
      });
    }));
    return {
      pulling: document.getElementById('forceLayoutPullCrossing').checked,
      freeEnds: document.getElementById('forceLayoutFreeTails').checked,
      upperAngleError: error([[1, 2, 20, 21], [5, 6, 18, 19]]),
      lowerAngleError: error([[10, 11, 29, 30], [11, 12, 28, 29], [15, 16, 26, 27], [16, 17, 25, 26]]),
      hubs: graph.nodes.filter(node => node.pseudoknotScaffold).map(node => node.scaffoldType).sort(),
      springs: graph.links.filter(link => link.pseudoknotScaffold).length,
      nucleotides: element.querySelectorAll('circle[node_type="nucleotide"]').length,
      pairs: [...element.querySelectorAll('line.link')].filter(line =>
        ['basepair', 'pseudoknot'].includes(line.__data__.linkType)).length,
      visibleHelpers: element.querySelectorAll('[link_type="fake"], [link_type="fake_fake"], [node_type="middle"]').length,
    };
  });
  // Fit the review image through the normal zoom gesture; do not alter geometry.
  const svg = page.locator('#rendering-canvas svg');
  const scale = await svg.evaluate(element => element.__zoom.k);
  await svg.hover();
  await page.mouse.wheel(0, 250);
  await page.waitForFunction(previous =>
    document.querySelector('#rendering-canvas svg').__zoom.k < previous, scale);
  await page.locator('#rendering-canvas').screenshot({ path: path.join(output, 'crossing-rri-stacks.png') });
  fs.writeFileSync(path.join(output, 'crossing-rri-stacks.json'), JSON.stringify(result, null, 2) + '\n');
  assert.ok(result.pulling && result.freeEnds, 'The example enables pulling and free ends');
  assert.deepEqual(result.hubs, ['interior', 'stem', 'stem'], 'Both stacks and the intervening bulge have hubs');
  assert.equal(result.springs, 36, 'Spokes, reciprocal chords and neighboring hubs are all connected');
  assert.ok(result.upperAngleError < 12 && result.upperAngleError < result.lowerAngleError + 2,
    `Upper stack distortion must be comparable to ordinary stacks: ${JSON.stringify(result)}`);
  assert.equal(result.nucleotides, 30);
  assert.equal(result.pairs, 10);
  assert.equal(result.visibleHelpers, 0);
}
