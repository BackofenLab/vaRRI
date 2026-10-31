import assert from 'node:assert/strict';
import { center } from '../lib/capture.js';
import { node, selected, near } from './helpers.js';

export default {
  id: 'reset-positions', title: 'Reset moved nodes',
  placements: ['canvas-help:reset', 'canvas-help:undo', 'docs:additional-features'],
  description: 'Drag a node, open View controls, and click Moved to select manually positioned nodes. Reset restores their original positions; Undo reverses the reset.',
  async run(capture, page) {
    const original = await center(node(page, 3));
    const untouched = await center(node(page, 9));
    await capture.caption('Drag a node to a new position');
    await capture.hold(1);
    await capture.drag(node(page, 3), -90, -70);
    const moved = await center(node(page, 3));
    near(moved.x - original.x, -90);
    near(moved.y - original.y, -70);
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 1/);
    assert.equal(await page.locator('#viewControlsToggle').getAttribute('aria-expanded'), 'false');
    await capture.caption('Open View controls to find Moved, Reset, and Undo');
    await capture.click(page.locator('#viewControlsToggle'));
    assert.equal(await page.locator('#viewControlsToggle').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#viewControlsPanel').isVisible(), true);
    await capture.caption('Click Moved to select the node you dragged');
    await capture.click(page.locator('#selectMovedBtn'));
    assert.equal(await selected(page), 1);
    assert.equal(await node(page, 3).evaluate(element => element.__data__.selected), true);
    await capture.caption('Click Reset to restore its original position');
    await capture.click(page.locator('#resetPositionsBtn'));
    const reset = await center(node(page, 3));
    near(reset.x, original.x);
    near(reset.y, original.y);
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 0/);
    await capture.hold(0.8);
    await capture.caption('Click Undo to return to the dragged position');
    await capture.click(page.locator('#undoCanvasBtn'));
    const restored = await center(node(page, 3));
    near(restored.x, moved.x);
    near(restored.y, moved.y);
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 1/);
    const stillUntouched = await center(node(page, 9));
    near(stillUntouched.x, untouched.x);
    near(stillUntouched.y, untouched.y);
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.2);
  },
};
