import assert from 'node:assert/strict';
import { center } from '../lib/capture.js';
import { node, selectPair } from './helpers.js';

export default {
  id: 'rotate-selection', title: 'Rotate a selection',
  placements: ['canvas-help:rotate', 'docs:additional-features'],
  description: 'Select at least two elements, then hold Ctrl or Command and scroll to rotate them around the pointer.',
  async run(capture, page) {
    await selectPair(capture, page);
    const before = await Promise.all([center(node(page, 3)), center(node(page, 4))]);
    await capture.caption('Ctrl / ⌘ + scroll to rotate');
    await capture.hold(0.3);
    await capture.wheel(page.locator('#rendering-canvas svg'), 240, 'Control');
    await page.waitForTimeout(250);
    const after = await Promise.all([center(node(page, 3)), center(node(page, 4))]);
    assert.ok(after.some((point, index) => Math.hypot(point.x - before[index].x,
      point.y - before[index].y) > 8), 'Selected nodes must visibly rotate');
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 2/);
    await capture.caption('Rotation stays in place');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.3);
  },
};
