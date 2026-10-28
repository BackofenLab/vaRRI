import assert from 'node:assert/strict';
import { center } from '../lib/capture.js';
import { node, selected, near } from './helpers.js';

export default {
  id: 'reset-positions', title: 'Reset moved nodes',
  placements: ['canvas-help:reset', 'canvas-help:undo', 'docs:additional-features'],
  description: 'Drag a node, click Moved to select manually positioned nodes, then click Reset to restore their original positions. Undo can reverse the reset.',
  async run(capture, page) {
    const original = await center(node(page, 3));
    await capture.caption('Drag a node to a new position');
    await capture.hold(1);
    await capture.drag(node(page, 3), -90, -70);
    const moved = await center(node(page, 3));
    near(moved.x - original.x, -90);
    near(moved.y - original.y, -70);
    await capture.caption('Moved selects fixed nodes');
    await capture.click(page.locator('#selectMovedBtn'));
    assert.equal(await selected(page), 1);
    await capture.caption('Reset restores the original position');
    await capture.click(page.locator('#resetPositionsBtn'));
    const reset = await center(node(page, 3));
    near(reset.x, original.x);
    near(reset.y, original.y);
    await capture.hold(0.8);
    await capture.caption('Undo reverses the reset');
    await capture.click(page.locator('#undoCanvasBtn'));
    const restored = await center(node(page, 3));
    near(restored.x, moved.x);
    near(restored.y, moved.y);
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.2);
  },
};
