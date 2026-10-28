import assert from 'node:assert/strict';
import { node, selected } from './helpers.js';

export default {
  id: 'rectangle-selection', title: 'Select with a rectangle',
  placements: ['canvas-help:select', 'docs:additional-features'],
  description: 'Hold Ctrl or Command and drag the canvas background around nodes to replace the selection.',
  async run(capture, page) {
    const boxes = await Promise.all([3, 4].map(index => node(page, index).boundingBox()));
    const start = { x: Math.min(...boxes.map(box => box.x)) - 25,
      y: Math.min(...boxes.map(box => box.y)) - 25 };
    const end = { x: Math.max(...boxes.map(box => box.x + box.width)) + 25,
      y: Math.max(...boxes.map(box => box.y + box.height)) + 25 };
    await capture.caption('Ctrl / ⌘ + drag the background around nodes');
    await capture.hold(1);
    await capture.dragBetween(start, end, 'Control');
    assert.equal(await selected(page), 2, 'The rectangle must select the two enclosed nodes');
    await capture.caption('The enclosed nodes replace the selection');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.4);
  },
};
