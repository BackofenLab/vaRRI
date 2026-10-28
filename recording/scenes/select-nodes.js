import assert from 'node:assert/strict';
import { node, selected, selectPair } from './helpers.js';

export default {
  id: 'select-nodes', title: 'Select nodes',
  description: 'Hold Ctrl (Command on macOS) and click nodes to add them to the selection. Click a selected node with the same modifier to remove it.',
  async run(capture, page) {
    await selectPair(capture, page);
    await capture.caption('Add another node to the selection');
    await capture.click(node(page, 5), 'Control');
    assert.equal(await selected(page), 3);
    await capture.hold(0.7);
    await capture.caption('Ctrl / ⌘ + click again to deselect');
    await capture.click(node(page, 4), 'Control');
    assert.equal(await selected(page), 2);
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.2);
  },
};
