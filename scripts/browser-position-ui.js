import assert from 'node:assert/strict';
import path from 'node:path';

export async function exercisePositionControlsUI(page, origin, output) {
  const params = new URLSearchParams({ sequence: 'AAAA&UUUU', structure: '((..&..))',
    highlighting: 'nothing', backgroundhighlighting: 'nothing', forceLayout: '0', textAnnotations: '[]' });
  await page.goto(`${origin}/index.html?${params}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#rendering-canvas circle') &&
    document.getElementById('rendering-canvas').style.visibility !== 'hidden');
  const moved = page.locator('#selectMovedBtn'), reset = page.locator('#resetPositionsBtn'), undo = page.locator('#undoCanvasBtn');
  assert.equal(await moved.textContent(), 'Moved: 0');
  assert.equal(await moved.isDisabled(), true);
  assert.equal(await reset.isDisabled(), true);
  assert.equal(await undo.isDisabled(), true);
  const node = page.locator('#rendering-canvas circle[node_type="nucleotide"]').first();
  const initial = await node.evaluate(element => ({ x: element.__data__.x, y: element.__data__.y }));
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2 + 20, { steps: 5 });
  await page.mouse.up();
  await page.waitForFunction(() => document.getElementById('selectMovedBtn').textContent === 'Moved: 1');
  assert.equal(await reset.isDisabled(), true, 'Reset needs a selected manually moved node');
  assert.equal(await undo.isEnabled(), true);
  await moved.click();
  assert.equal(await page.locator('#rendering-canvas [data-varri-selected]').count(), 1);
  assert.equal(await reset.isEnabled(), true);
  const cropBox = await page.locator('#cropping').boundingBox();
  const movedBox = await moved.boundingBox();
  assert.ok(movedBox.x >= cropBox.x + cropBox.width, 'Manual controls sit to the right of Crop');
  assert.ok(Math.abs(movedBox.y - cropBox.y) < 15, 'Controls fit on the same compact row');
  await page.screenshot({ path: path.join(output, 'manual-position-controls.png'), fullPage: true });
  await reset.click();
  assert.deepEqual(await node.evaluate(element => ({ x: element.__data__.x, y: element.__data__.y })), initial);
  assert.equal(await moved.textContent(), 'Moved: 0');
  assert.equal(await reset.isDisabled(), true);
  await undo.click();
  assert.equal(await moved.textContent(), 'Moved: 1', 'Undo restores reset manual positions');
  await page.locator('#rendering-canvas').focus();
  await page.keyboard.press('Control+z');
  assert.equal(await moved.textContent(), 'Moved: 0', 'Canvas shortcut undoes the original drag');
  assert.equal(await undo.isDisabled(), true);
  // An exhausted canvas history leaves positions unchanged.
  await moved.evaluate(() => document.getElementById('rendering-canvas').focus());
  await page.keyboard.press('Control+z');
  assert.deepEqual(await node.evaluate(element => ({ x: element.__data__.x, y: element.__data__.y })), initial);
}
