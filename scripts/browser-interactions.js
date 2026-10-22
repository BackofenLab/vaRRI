import assert from 'node:assert/strict';
import { exerciseRectangleSelection } from './browser-selection.js';

const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.6,
  `${message}: expected ${expected}, got ${actual}`);
const origin = locator => locator.evaluate(element => {
  const matrix = element.getScreenCTM();
  return { x: matrix.e, y: matrix.f };
});
async function click(page, locator, control = false) {
  const box = await locator.boundingBox();
  if (control) await page.keyboard.down('Control');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  if (control) await page.keyboard.up('Control');
}
async function drag(page, locator, dx, dy) {
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

/** Exercise real input against native and bundled APIs, in both layout modes. */
export async function exerciseInteractions(page) {
  for (const forceLayout of [false, true]) {
    await page.evaluate(async forceLayout => {
      const api = window.exportApi;
      api.clearTextAnnotations();
      const input = api.validate({ sequence: 'AAAA&UUUU', structure: '((..&..))',
        highlighting: 'nothing', backgroundhighlighting: 'nothing', textAnnotations: [] });
      await api.render('second', input, { forceLayout });
      const graph = document.querySelector('#second circle[node_type="nucleotide"]').__data__.rna;
      // Hold unrelated nodes still to isolate pointer displacement from forces.
      graph.nodes.forEach(node => { node.fixed = 1; node.px = node.x; node.py = node.y; });
      window.interactionGraph = graph;
      const item = api.registerTextAnnotation({ text: 'Group label', size: 7 });
      const box = document.querySelector('#second svg').getBoundingClientRect();
      api.placeTextAnnotation(item.id, box.x + 430, box.y + 110);
      window.interactionTextId = item.id;
    }, forceLayout);
    const host = page.locator('#second');
    const svg = host.locator('svg');
    const node = host.locator('g.gnode').filter({ has: page.locator('circle[node_type="nucleotide"]') }).first();
    const other = host.locator('g.gnode').filter({ has: page.locator('circle[node_type="nucleotide"]') }).nth(2);
    const label = host.locator('g.gnode').filter({ has: page.locator('circle[node_type="label"]') }).first();
    const text = host.locator('[data-varri-text]');
    const plotBefore = await host.locator('.fornac-plot').getAttribute('transform');
    const before = await origin(node);
    // The dragged nucleotide begins unpinned; release must retain its new place.
    await node.evaluate(element => { element.__data__.fixed = 0; });
    await drag(page, node, -30, 20);
    const after = await origin(node);
    // A live force may move an unpinned node before mouse-down. The gesture still
    // fixes it and the remaining checks use fully stationary targets.
    if (!forceLayout) {
      near(after.x - before.x, -30, 'Single nucleotide follows pointer x');
      near(after.y - before.y, 20, 'Single nucleotide follows pointer y');
    }
    assert.equal(await node.evaluate(element => element.__data__.fixed), 1, 'Released node stays fixed');
    await page.waitForTimeout(100);
    assert.deepEqual(await origin(node), after, 'Force cannot pull a released node back');
    const labelBefore = await origin(label);
    await drag(page, label, -20, 15);
    const labelAfter = await origin(label);
    near(labelAfter.x - labelBefore.x, -20, 'Numbering label drags independently x');
    near(labelAfter.y - labelBefore.y, 15, 'Numbering label drags independently y');
    assert.equal(await host.locator('.fornac-plot').getAttribute('transform'), plotBefore, 'Element drags do not pan');

    await click(page, node, true);
    await click(page, other, true);
    await click(page, label, true);
    await click(page, text, true);
    assert.equal(await host.locator('[data-varri-selected]').count(), 4, 'Mixed selection adds all target types');
    await click(page, other, true);
    assert.equal(await host.locator('[data-varri-selected]').count(), 3, 'Ctrl-click toggles an existing member off');
    await click(page, other, true);
    const targets = [node, other, label, text];
    for (const handle of [node, text]) {
      const starts = await Promise.all(targets.map(origin));
      await drag(page, handle, 18, -12);
      const ends = await Promise.all(targets.map(origin));
      ends.forEach((end, i) => {
        near(end.x - starts[i].x, 18, `Group member ${i} follows x`);
        near(end.y - starts[i].y, -12, `Group member ${i} follows y`);
      });
    }
    assert.equal(await host.locator('[data-varri-interaction-overlay] rect').count(), 4, 'Selection is visible');

    // Rotation and zoom must be inverted for every type within one group.
    await page.evaluate(() => window.exportApi.rotateVisualization('second', 37, { mode: 'absolute' }));
    const zoomBefore = await svg.evaluate(element => element.__zoom.k);
    await svg.hover({ position: { x: 320, y: 240 } });
    await page.mouse.wheel(0, 80);
    await page.waitForFunction(k => document.querySelector('#second svg').__zoom.k < k, zoomBefore);
    await page.waitForTimeout(200);
    const rotatedStarts = await Promise.all(targets.map(origin));
    await drag(page, label, -12, 16);
    const rotatedEnds = await Promise.all(targets.map(origin));
    rotatedEnds.forEach((end, i) => {
      near(end.x - rotatedStarts[i].x, -12, `Rotated group ${i} follows x`);
      near(end.y - rotatedStarts[i].y, 16, `Rotated group ${i} follows y`);
    });

    const exported = await page.evaluate(() => {
      const live = document.querySelector('#second svg');
      const svg = new DOMParser().parseFromString(window.exportApi.buildSVGString('second'), 'image/svg+xml');
      const transforms = root => [...root.querySelectorAll('g.gnode, [data-varri-text]')]
        .map(element => element.getAttribute('transform'));
      return { live: transforms(live), exported: transforms(svg),
        feedback: svg.querySelectorAll('[data-varri-interaction-overlay], [data-varri-selected]').length };
    });
    assert.deepEqual(exported.exported, exported.live, 'SVG keeps every manually moved position');
    assert.equal(exported.feedback, 0, 'Selection feedback is absent from exports');
    const [download] = await Promise.all([page.waitForEvent('download'),
      page.evaluate(() => window.exportApi.downloadPNG('second'))]);
    assert.equal(await download.failure(), null, 'Edited layout also exports to PNG');
    await download.saveAs(`output/playwright/core-contract/dragged-${forceLayout ? 'force' : 'static'}.png`);

    const outsider = host.locator('g.gnode').filter({ has: page.locator('circle[node_type="nucleotide"]') }).nth(5);
    const untouched = await origin(other);
    await drag(page, outsider, 8, 8);
    assert.equal(await host.locator('[data-varri-selected]').count(), 0, 'Dragging outside selection clears it');
    assert.deepEqual(await origin(other), untouched, 'Previously selected node does not move with outsider');
    await exerciseRectangleSelection(page, host);

    const svgBox = await svg.boundingBox();
    const panBefore = await svg.evaluate(element => ({ x: element.__zoom.x, y: element.__zoom.y }));
    await page.mouse.move(svgBox.x + 15, svgBox.y + 15);
    await page.mouse.down();
    await page.mouse.move(svgBox.x + 40, svgBox.y + 35, { steps: 3 });
    await page.mouse.up();
    near(await svg.evaluate(element => element.__zoom.x) - panBefore.x, 25, 'Background pans x');
    near(await svg.evaluate(element => element.__zoom.y) - panBefore.y, 20, 'Background pans y');

    const box = await node.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.evaluate(() => window.exportApi.cancelActiveRender());
    const cancelled = await page.evaluate(() => window.interactionGraph.nodes.map(node => [node.x, node.y]));
    await page.mouse.move(box.x + 90, box.y + 60);
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => window.interactionGraph.nodes.map(node => [node.x, node.y])),
      cancelled, 'Cancellation detaches the active drag without restarting forces');
  }

  await page.evaluate(async () => {
    const api = window.exportApi;
    await api.render('second', api.validate({ sequence: 'AAAA', structure: '....', textAnnotations: [] }));
  });
  const svg = page.locator('#second svg');
  const box = await svg.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.evaluate(() => window.exportApi.cancelActiveRender());
  const stopped = await page.locator('#second .fornac-plot').getAttribute('transform');
  await page.mouse.move(box.x + 70, box.y + 60);
  await page.mouse.up();
  assert.equal(await page.locator('#second .fornac-plot').getAttribute('transform'), stopped,
    'Cancellation detaches an active background pan');
}
