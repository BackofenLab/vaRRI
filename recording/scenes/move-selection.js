import assert from 'node:assert/strict';
import { center } from '../lib/capture.js';
import { node, near, selectPair } from './helpers.js';

export default {
  id: 'move-selection', title: 'Move a selection',
  description: 'Select two nodes with Ctrl/Command-click, release the modifier, then drag either selected node. Both move together and retain their new positions.',
  async run(capture, page) {
    await selectPair(capture, page);
    const before = await Promise.all([center(node(page, 3)), center(node(page, 4))]);
    const unchanged = await center(node(page, 8));
    await capture.caption('Release Ctrl / ⌘, then drag the selection');
    await capture.hold(0.8);
    await capture.drag(node(page, 3), -90, -70);
    const after = await Promise.all([center(node(page, 3)), center(node(page, 4))]);
    for (let index = 0; index < 2; index++) {
      near(after[index].x - before[index].x, -90);
      near(after[index].y - before[index].y, -70);
    }
    const other = await center(node(page, 8));
    near(other.x, unchanged.x);
    near(other.y, unchanged.y);
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 2/);
    await capture.caption('Both nodes stay at their new positions');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.5);
  },
};
