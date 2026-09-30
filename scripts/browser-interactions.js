import assert from 'node:assert/strict';

/** Exercise actual pointer events against either the native or bundled API. */
export async function exerciseInteractions(page) {
  await page.evaluate(async () => {
    const api = window.exportApi;
    const v = api.validate({ sequence: 'AAAA&UUUU', structure: '((..&..))',
      highlighting: 'nothing', backgroundhighlighting: 'nothing' });
    await api.render('second', v, { forceLayout: true });
    const graph = document.querySelector('#second circle[node_type="nucleotide"]').__data__.rna;
    // Pin the graph to isolate pointer displacement from ongoing simulation.
    graph.nodes.forEach(node => { node.fixed = 1; node.px = node.x; node.py = node.y; });
    window.interactionGraph = graph;
  });
  const circle = page.locator('#second circle[node_type="nucleotide"]').first();
  const before = await circle.evaluate(element => {
    const { x, y } = element.__data__;
    return { x, y, zoom: document.querySelector('#second svg').__zoom.k };
  });
  const box = await circle.boundingBox();
  assert.ok(box, 'The nucleotide can be dragged');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 25, { steps: 5 });
  await page.mouse.up();
  const after = await circle.evaluate(element => ({ x: element.__data__.x, y: element.__data__.y,
    fixed: element.__data__.fixed }));
  assert.ok(Math.abs(after.x - before.x - 40 / before.zoom) < 0.5, 'Drag respects zoom scale (x)');
  assert.ok(Math.abs(after.y - before.y - 25 / before.zoom) < 0.5, 'Drag respects zoom scale (y)');
  assert.equal(after.fixed, 1, 'Dragging restores a previously fixed node');

  const secondCircle = page.locator('#second circle[node_type="nucleotide"]').nth(1);
  const secondBox = await secondCircle.boundingBox();
  await page.keyboard.down('Control');
  await page.mouse.click(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
  await page.keyboard.up('Control');
  assert.equal(await page.evaluate(() => window.interactionGraph.nodes.filter(node => node.selected).length),
    2, 'Ctrl-click preserves multi-selection');

  const svg = page.locator('#second svg');
  const transform = await svg.evaluate(element => ({ k: element.__zoom.k, x: element.__zoom.x }));
  await svg.hover({ position: { x: 100, y: 100 } });
  await page.mouse.wheel(0, -200);
  await page.waitForFunction(k => document.querySelector('#second svg').__zoom.k > k, transform.k);
  // Wait for the wheel gesture to finish before testing a separate pan gesture.
  await page.waitForTimeout(200);
  const svgBox = await svg.boundingBox();
  const panBefore = await svg.evaluate(element => element.__zoom.x);
  await page.mouse.move(svgBox.x + 20, svgBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(svgBox.x + 45, svgBox.y + 40, { steps: 3 });
  await page.mouse.up();
  assert.ok(Math.abs(await svg.evaluate(element => element.__zoom.x) - panBefore - 25) < 0.5,
    'Background panning updates the stored zoom transform');

  const finalBox = await circle.boundingBox();
  await page.mouse.move(finalBox.x + finalBox.width / 2, finalBox.y + finalBox.height / 2);
  await page.mouse.down();
  await page.evaluate(() => window.exportApi.cancelActiveRender());
  const cancelled = await page.evaluate(() => window.interactionGraph.nodes.map(node => [node.x, node.y]));
  await page.mouse.move(finalBox.x + 90, finalBox.y + 60);
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.interactionGraph.nodes.map(node => [node.x, node.y])),
    cancelled, 'Cancelling an active drag detaches handlers and cannot restart the old simulation');

  await page.evaluate(async () => {
    const api = window.exportApi;
    await api.render('second', api.validate({ sequence: 'AAAA', structure: '....' }));
  });
  const nextBox = await svg.boundingBox();
  await page.mouse.move(nextBox.x + 20, nextBox.y + 20);
  await page.mouse.down();
  await page.evaluate(() => window.exportApi.cancelActiveRender());
  const stoppedTransform = await page.locator('#second .fornac-plot').getAttribute('transform');
  await page.mouse.move(nextBox.x + 70, nextBox.y + 60);
  await page.mouse.up();
  assert.equal(await page.locator('#second .fornac-plot').getAttribute('transform'), stoppedTransform,
    'Cancelling an active pan detaches its window handlers');
}
