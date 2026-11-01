import assert from 'node:assert/strict';
import { node, selected } from './helpers.js';

export default {
  id: 'rectangle-selection', title: 'Select with a rectangle',
  placements: ['canvas-help:select', 'docs:additional-features'],
  description: 'Hold Ctrl or Command and drag the canvas background around nodes to replace the selection.',
  async run(capture, page) {
    assert.equal(await selected(page), 0, 'Start without a selection');
    await capture.caption('Ctrl / ⌘ + click a node to start a selection');
    await capture.click(node(page, 0), 'Control');
    assert.equal(await selected(page), 1, 'The first click selects one node');
    assert.equal(await node(page, 0).evaluate(element => element.__data__.selected), true);
    const boxes = await Promise.all([3, 4].map(index => node(page, index).boundingBox()));
    const start = { x: Math.min(...boxes.map(box => box.x)) - 25,
      y: Math.min(...boxes.map(box => box.y)) - 25 };
    const end = { x: Math.max(...boxes.map(box => box.x + box.width)) + 25,
      y: Math.max(...boxes.map(box => box.y + box.height)) + 25 };
    await capture.caption('Ctrl / ⌘ + drag the background around two other nodes');
    await capture.dragBetween(start, end, 'Control');
    assert.equal(await selected(page), 2, 'The rectangle must select the two enclosed nodes');
    assert.equal(await node(page, 0).evaluate(element => element.__data__.selected), false,
      'The previously selected node outside the rectangle must be deselected');
    for (const index of [3, 4]) {
      assert.equal(await node(page, index).evaluate(element => element.__data__.selected), true,
        'Each enclosed node must actually be selected');
    }
    await capture.move({ x: 80, y: 140 });
    await capture.caption('The rectangle replaces the selection with these two nodes');
    await capture.clearCaption();
    await capture.hold(1.8);
  },
};
