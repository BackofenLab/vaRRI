import assert from 'node:assert/strict';

const point = locator => locator.evaluate(element => {
  const { e: x, f: y } = element.getScreenCTM();
  return { x, y };
});
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 0.6, `${message}: ${a} vs ${b}`);
async function press(page, locator, control = false) {
  const { x, y } = await point(locator);
  if (control) await page.keyboard.down('Control');
  await page.mouse.click(x, y);
  if (control) await page.keyboard.up('Control');
}
async function drag(page, locator, dx, dy) {
  const { x, y } = await point(locator);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}
const state = page => page.evaluate(() => window.exportApi.getCanvasInteractionState());

/** Review #97: reversible manual positions and pointer-centered selection rotation. */
export async function exercisePositionEditing(page) {
  for (const forceLayout of [false, true]) {
    await page.evaluate(async forceLayout => {
      const api = window.exportApi;
      await api.render('second', api.validate({ sequence: 'AAAA&UUUU', structure: '((..&..))',
        textAnnotations: [], highlighting: 'nothing', backgroundhighlighting: 'nothing' }), { forceLayout });
      const graph = document.querySelector('#second circle').__data__.rna;
      graph.nodes.forEach(node => { node.fixed = 1; node.px = node.x; node.py = node.y; });
      api.rotateVisualization('second', 29, { mode: 'absolute' });
      const text = api.registerTextAnnotation({ text: 'Rotate me', size: 7 });
      const box = document.querySelector('#second svg').getBoundingClientRect();
      api.placeTextAnnotation(text.id, box.x + 450, box.y + 130);
    }, forceLayout);
    const host = page.locator('#second');
    const svg = host.locator('svg');
    const node = host.locator('g.gnode').filter({ has: page.locator('circle[node_type="nucleotide"]') }).first();
    const number = host.locator('g.gnode').filter({ has: page.locator('circle[node_type="label"]') }).first();
    const text = host.locator('[data-varri-text]');
    const original = await point(node);
    const box = await svg.boundingBox();
    const selected = () => host.locator('[data-varri-selected]').count();
    await press(page, node, true);
    const plot = await host.locator('.fornac-plot').getAttribute('transform');
    await page.keyboard.down('Control');
    await page.mouse.click(box.x + 15, box.y + 15);
    await page.keyboard.up('Control');
    assert.equal(await selected(), 0, 'Ctrl-click on background clears without dragging');
    assert.equal(await host.locator('.fornac-plot').getAttribute('transform'), plot);
    await press(page, node, true);
    await press(page, number, true);
    await press(page, node);
    assert.equal(await selected(), 0, 'A plain click on a selected member clears selection');
    await press(page, node, true);
    await press(page, number);
    assert.equal(await selected(), 0, 'A plain click on an unselected element also clears');
    assert.equal((await state(page)).movedCount, 0, 'Clicks do not create fixations');

    await drag(page, node, -35, 20);
    assert.equal((await state(page)).movedCount, 1);
    await drag(page, node, -8, 2);
    assert.equal((await state(page)).movedCount, 1, 'Repeated drags count a node once');
    await page.keyboard.press('Control+z');
    const afterUndo = await point(node);
    near(afterUndo.x - original.x, -35, 'Undo restores the prior drag x');
    near(afterUndo.y - original.y, 20, 'Undo restores the prior drag y');
    const saved = await point(node);
    await drag(page, number, -15, -10);
    await drag(page, text, 10, -10);
    assert.equal((await state(page)).movedCount, 2, 'Text annotations are excluded from the moved count');
    await page.evaluate(() => window.exportApi.selectManuallyPositionedElements());
    assert.equal(await selected(), 2, 'Select moved selects nodes and numbering only');
    assert.equal(await text.getAttribute('data-varri-selected'), null);
    await press(page, number, true);
    await page.evaluate(() => window.exportApi.resetSelectedPositions());
    assert.equal((await state(page)).movedCount, 1, 'Reset changes only selected manual nodes');
    const reset = await point(node);
    near(reset.x, original.x, 'Reset returns to the position before the first drag x');
    near(reset.y, original.y, 'Reset returns to the position before the first drag y');
    await page.evaluate(() => window.exportApi.undoCanvasEdit());
    const restored = await point(node);
    near(restored.x, saved.x, 'Reset itself is undoable x');
    near(restored.y, saved.y, 'Reset itself is undoable y');
    assert.equal((await state(page)).movedCount, 2);

    await page.evaluate(() => window.exportApi.selectManuallyPositionedElements());
    await press(page, text, true);
    const targets = [node, number, text];
    const before = await Promise.all(targets.map(point));
    const textsBefore = await page.evaluate(() => window.exportApi.getTextAnnotations());
    const pivot = { x: box.x + 330, y: box.y + 240 };
    const viewport = await svg.evaluate(element => ({ ...element.__zoom }));
    await page.mouse.move(pivot.x, pivot.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 60);
    await page.mouse.wheel(0, 60);
    await page.keyboard.up('Control');
    await page.waitForTimeout(250);
    const after = await Promise.all(targets.map(point));
    const angle = Math.atan2(after[0].y - pivot.y, after[0].x - pivot.x) -
      Math.atan2(before[0].y - pivot.y, before[0].x - pivot.x);
    assert.ok(Math.abs(angle) > 0.05, 'Ctrl-wheel rotates the selection');
    after.forEach((p, i) => {
      const dx = before[i].x - pivot.x, dy = before[i].y - pivot.y;
      near(p.x, pivot.x + dx * Math.cos(angle) - dy * Math.sin(angle), `Rigid rotation ${i} x`);
      near(p.y, pivot.y + dx * Math.sin(angle) + dy * Math.cos(angle), `Rigid rotation ${i} y`);
    });
    assert.deepEqual(await svg.evaluate(element => ({ ...element.__zoom })), viewport, 'Ctrl-wheel does not zoom or pan');
    const textAngle = await text.locator('text').evaluate(element => {
      const m = element.getScreenCTM(); return Math.atan2(m.b, m.a);
    });
    near(textAngle, 0, 'Rotated text stays readable');
    await page.keyboard.press('Control+z');
    const undone = await Promise.all(targets.map(point));
    undone.forEach((p, i) => { near(p.x, before[i].x, `Undo wheel burst ${i} x`); near(p.y, before[i].y, `Undo wheel burst ${i} y`); });
    assert.deepEqual(await page.evaluate(() => window.exportApi.getTextAnnotations()), textsBefore, 'Undo restores model text positions');

    await press(page, node);
    await press(page, node, true);
    const single = await point(node);
    await page.mouse.move(pivot.x, pivot.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 100);
    await page.keyboard.up('Control');
    await page.waitForTimeout(220);
    assert.deepEqual(await point(node), single, 'One selected element cannot rotate');
    assert.deepEqual(await svg.evaluate(element => ({ ...element.__zoom })), viewport, 'Ctrl-wheel is reserved even with one selection');

    await page.evaluate(() => window.exportApi.cancelActiveRender());
    assert.deepEqual(await state(page), { movedCount: 0, selectedNodeCount: 0, selectedMovedCount: 0, canUndo: false },
      'Disposal clears counts and history');
    assert.equal(await page.evaluate(() => window.exportApi.undoCanvasEdit()), false);
  }
}
