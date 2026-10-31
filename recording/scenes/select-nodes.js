import assert from 'node:assert/strict';
import { node, selected } from './helpers.js';

export default {
  id: 'select-nodes', title: 'Select nodes',
  placements: ['canvas-help:select', 'docs:additional-features'],
  description: 'Hold Ctrl (Command on macOS) and click nodes to add them to the selection. Click a selected node with the same modifier to remove it.',
  async run(capture, page) {
    await capture.caption('Hold Ctrl / ⌘ and click two nodes to select them');
    await capture.hold(2);
    await capture.click(node(page, 3), 'Control');
    assert.equal(await selected(page), 1, 'The first click must select one node');
    await capture.click(node(page, 4), 'Control');
    assert.equal(await selected(page), 2, 'The second click must add another node');
    await capture.hold(0.6);
    await capture.caption('Keep holding Ctrl / ⌘ and click another node to add it');
    await capture.hold(2);
    await capture.click(node(page, 5), 'Control');
    assert.equal(await selected(page), 3, 'The third node must join the selection');
    await capture.hold(0.7);
    await capture.caption('Ctrl / ⌘ + click a selected node again to remove it');
    await capture.hold(2);
    await capture.click(node(page, 4), 'Control');
    assert.equal(await selected(page), 2, 'Removing one node must leave two selected');
    assert.equal(await node(page, 4).getAttribute('data-varri-selected'), null,
      'The clicked node must be deselected');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.5);
  },
};
