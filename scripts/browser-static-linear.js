import assert from 'node:assert/strict';

/** Native and bundled API must produce the same frozen, editable linear scene. */
export async function exerciseStaticLinearLayouts(page, screenshotPath) {
  const scene = await page.evaluate(async () => {
    const api = window.testApi.createVaRRI();
    window.staticLinearApi = api;
    const structure = '((..(&)..))((..(..)..))';
    const v = api.validate({ sequence: structure.replace(/[^&]/g, 'A'), structure,
      startIndex1: '-2', startIndex2: '7', backgroundhighlighting: 'region' });
    await api.render('first', v, { forceLayout: false,
      forceLayoutLinearRRI: true, forceLayoutLinearStructure: true });
    const read = () => [...document.querySelectorAll('#first circle[node_type="nucleotide"]')]
      .map(el => { const n = el.__data__; return { num: n.num, x: n.x, y: n.y, fixed: Boolean(n.fixed) }; });
    const before = read();
    await new Promise(resolve => setTimeout(resolve, 250));
    const after = read();
    return { before, after, svg: api.buildSVGString('first') };
  });
  assert.equal(scene.before.length, 22);
  assert.deepEqual(scene.after, scene.before, 'Static linear coordinates remain frozen after rendering');
  assert.ok(scene.before.every(node => !node.fixed && Number.isFinite(node.x) && Number.isFinite(node.y)));
  const nodes = new Map(scene.before.map(node => [node.num, node]));
  const y = nodes.get(1).y;
  for (const [a, b] of [[1, 10], [2, 9], [5, 6]]) {
    assert.ok(Math.abs(nodes.get(a).y - y) < 1e-6, 'RRI rail is horizontal');
    assert.ok(Math.abs(Math.hypot(nodes.get(a).x - nodes.get(b).x, nodes.get(a).y - nodes.get(b).y) - 15) < 1e-6);
  }
  assert.ok(scene.svg.includes('<svg') && !scene.svg.includes('NaN'));
  if (screenshotPath) await page.locator('#first').screenshot({ path: screenshotPath });
  const node = page.locator('#first circle[node_type="nucleotide"]').first();
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 + 15, { steps: 4 });
  await page.mouse.up();
  assert.equal(await page.evaluate(() => window.staticLinearApi.getCanvasInteractionState().movedCount), 1);
  await page.evaluate(() => window.staticLinearApi.selectManuallyPositionedElements());
  await page.evaluate(() => window.staticLinearApi.releaseSelectedPositions());
  const released = await node.evaluate(el => [el.__data__.x, el.__data__.y]);
  await page.waitForTimeout(150);
  assert.deepEqual(await node.evaluate(el => [el.__data__.x, el.__data__.y]), released,
    'Release must not restart static forces');
  await page.evaluate(() => { window.staticLinearApi.undoCanvasEdit(); window.staticLinearApi.undoCanvasEdit(); });
  const restored = await node.evaluate(el => [el.__data__.x, el.__data__.y]);
  assert.deepEqual(restored, [scene.before[0].x, scene.before[0].y], 'Undo restores the static linear placement');
  await page.evaluate(() => window.staticLinearApi.cancelActiveRender());
  return scene.before;
}
