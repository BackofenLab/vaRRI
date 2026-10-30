import assert from 'node:assert/strict';
import { center } from '../lib/capture.js';
import { node, near, selectPair, selected } from './helpers.js';

export default {
  id: 'rotate-selection', title: 'Rotate a selection',
  placements: ['canvas-help:rotate', 'docs:additional-features'],
  description: 'Select at least two elements, then hold Ctrl or Command and scroll to rotate them around the pointer.',
  async run(capture, page) {
    await selectPair(capture, page);
    // An existing nucleotide provides a visible pivot with room for the rotated pair.
    const pivotTarget = node(page, 2);
    const pivot = await center(pivotTarget);
    const before = await Promise.all([center(node(page, 3)), center(node(page, 4))]);
    const stationary = await center(node(page, 12));
    await capture.caption('Hold Ctrl / ⌘ and scroll to rotate around the pointer');
    await capture.hold(2);
    await capture.wheel(pivotTarget, 240, 'Control');
    await page.waitForTimeout(250);
    const after = await Promise.all([center(node(page, 3)), center(node(page, 4))]);
    assert.ok(after.some((point, index) => Math.hypot(point.x - before[index].x,
      point.y - before[index].y) > 8), 'Selected nodes must visibly rotate');
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    after.forEach((point, index) => near(distance(point, pivot), distance(before[index], pivot)));
    near(distance(after[0], after[1]), distance(before[0], before[1]));
    const unchanged = await center(node(page, 12));
    near(unchanged.x, stationary.x); near(unchanged.y, stationary.y);
    assert.equal(await selected(page), 2, 'The rotated nodes remain selected');
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 2/);
    await capture.hold(0.8);
    await capture.caption('Both nodes keep their rotated positions');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.3);
    const retained = await Promise.all([center(node(page, 3)), center(node(page, 4))]);
    retained.forEach((point, index) => {
      near(point.x, after[index].x); near(point.y, after[index].y);
    });
  },
};
