import assert from 'node:assert/strict';
import path from 'node:path';
import { exercisePositionLayout } from './browser-position-layout.js';
import { exerciseNodeSelection } from './browser-node-selection.js';
import { exerciseStandaloneCanvasHelp } from './browser-canvas-help.js';

export async function exercisePositionControlsUI(page, origin, output) {
  await exerciseStandaloneCanvasHelp(page, origin);
  await exercisePositionLayout(page, origin, output);
  const params = new URLSearchParams({ sequence: 'AAAA&UUUU', structure: '((..&..))',
    highlighting: 'nothing', backgroundhighlighting: 'nothing', forceLayout: '0', textAnnotations: '[]' });
  await page.goto(`${origin}/index.html?${params}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#rendering-canvas circle') &&
    document.getElementById('rendering-canvas').style.visibility !== 'hidden');
  const viewControls = page.locator('#viewControlsToggle');
  assert.equal(await viewControls.getAttribute('aria-expanded'), 'true');
  await page.waitForFunction(() => {
    const canvas = document.getElementById('rendering-canvas');
    const values = canvas.querySelector('svg')?.getAttribute('viewBox')?.split(/\s+/).map(Number);
    return values?.length === 4 && Math.abs(values[2] - canvas.clientWidth) < 1 &&
      Math.abs(values[3] - canvas.clientHeight) < 1;
  });
  const moved = page.locator('#selectMovedBtn'), reset = page.locator('#resetPositionsBtn'), undo = page.locator('#undoCanvasBtn');
  const release = page.locator('#releasePositionsBtn');
  assert.equal(await moved.textContent(), 'Moved: 0');
  assert.equal(await moved.isDisabled(), true);
  assert.equal(await reset.isDisabled(), true);
  assert.equal(await undo.isDisabled(), true);
  assert.equal(await release.isDisabled(), true);
  const node = page.locator('#rendering-canvas circle[node_type="nucleotide"]').first();
  const initial = await node.evaluate(element => ({ x: element.__data__.x, y: element.__data__.y }));
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2 + 20, { steps: 5 });
  await page.mouse.up();
  assert.equal(await viewControls.getAttribute('aria-expanded'), 'false',
    'Starting an interaction in the visualization closes View controls');
  assert.equal(await page.locator('#viewControlsPanel').isVisible(), false);
  assert.equal(await page.locator('#rendering-canvas').evaluate(element => getComputedStyle(element).outlineStyle), 'none',
    'Pointer gestures do not add a frame around the canvas');
  await page.waitForFunction(() => document.getElementById('selectMovedBtn').textContent === 'Moved: 1');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('#rendering-canvas').evaluate(element => element === document.activeElement &&
    getComputedStyle(element).outlineStyle === 'solid'), true, 'Keyboard navigation retains a visible canvas focus indicator');
  await viewControls.click();
  assert.equal(await reset.isDisabled(), true, 'Reset needs a selected manually moved node');
  assert.equal(await undo.isEnabled(), true);
  await moved.click();
  assert.equal(await page.locator('#rendering-canvas [data-varri-selected]').count(), 1);
  assert.equal(await reset.isEnabled(), true);
  assert.equal(await release.isDisabled(), true, 'Release stays disabled outside Force layout mode');
  assert.ok((await release.getAttribute('title')).includes('Force layout'));
  const cropBox = await page.locator('#cropping').boundingBox();
  const movedBox = await moved.boundingBox();
  const panelBox = await page.locator('#viewControlsPanel').boundingBox();
  const canvasBox = await page.locator('#rendering-canvas').boundingBox();
  const toggleBox = await viewControls.boundingBox();
  assert.ok(panelBox.x >= canvasBox.x && panelBox.x + panelBox.width <= toggleBox.x + 1 &&
    toggleBox.x + toggleBox.width <= canvasBox.x + canvasBox.width + 1,
  'View controls overlay the right side of the canvas');
  assert.ok(movedBox.y >= cropBox.y + cropBox.height, 'Manual controls follow Cropping in the side panel');
  await page.screenshot({ path: path.join(output, 'manual-position-controls.png'), fullPage: true });
  const edited = await node.evaluate(element => ({ x: element.__data__.x, y: element.__data__.y }));
  await reset.click();
  assert.deepEqual(await node.evaluate(element => ({ x: element.__data__.x, y: element.__data__.y })), initial);
  assert.equal(await moved.textContent(), 'Moved: 0');
  assert.equal(await reset.isDisabled(), true);
  await undo.click();
  assert.equal(await node.evaluate(element => element.__data__.fixed), 1);
  assert.equal(await moved.textContent(), 'Moved: 1');
  assert.deepEqual(await node.evaluate(element => ({ x: element.__data__.x, y: element.__data__.y })), edited,
    'Undo restores reset manual positions');
  await page.locator('#rendering-canvas').focus();
  await page.keyboard.press('Meta+z');
  assert.equal(await moved.textContent(), 'Moved: 0', 'Canvas shortcut undoes the original drag');
  assert.equal(await undo.isDisabled(), true);
  // An exhausted canvas history leaves positions unchanged.
  await moved.evaluate(() => document.getElementById('rendering-canvas').focus());
  await page.keyboard.press('Control+z');
  assert.deepEqual(await node.evaluate(element => ({ x: element.__data__.x, y: element.__data__.y })), initial);
  await exerciseNodeSelection(page);
}
