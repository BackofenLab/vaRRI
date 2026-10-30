import assert from 'node:assert/strict';
import { center } from '../lib/capture.js';
import { node, near, selected } from './helpers.js';

export default {
  id: 'release-positions', title: 'Release a moved node',
  placements: ['canvas-help:release', 'docs:additional-features'],
  description: 'Move a node, select it through Moved, and release its manual fixation while retaining its current position.',
  async run(capture, page) {
    const original = await center(node(page, 3));
    await capture.caption('Drag a node to fix it in a new position');
    await capture.hold(2);
    await capture.drag(node(page, 3), -90, -70);
    const moved = await center(node(page, 3));
    near(moved.x - original.x, -90);
    near(moved.y - original.y, -70);
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 1/);
    await capture.caption('Click Moved to select the fixed node');
    await capture.hold(1.8);
    await capture.click(page.locator('#selectMovedBtn'));
    assert.equal(await selected(page), 1);
    await capture.caption('Click Release to remove its fixed position');
    await capture.hold(2);
    await capture.click(page.locator('#releasePositionsBtn'));
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 0/);
    assert.equal(await page.locator('#resetPositionsBtn').isDisabled(), true);
    const released = await center(node(page, 3));
    near(released.x, moved.x); near(released.y, moved.y);
    const fixed = await node(page, 3).evaluate(element => ({ fixed: element.__data__.fixed,
      fx: element.__data__.fx, fy: element.__data__.fy }));
    assert.equal(Boolean(fixed.fixed || fixed.fx != null || fixed.fy != null), false);
    await capture.caption('The node stays here; Moved returns to 0');
    await capture.hold(2);
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.3);
  },
};
