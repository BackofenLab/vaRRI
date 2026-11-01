import assert from 'node:assert/strict';
import { node, selected } from './helpers.js';

const position = target => target.evaluate(element => {
  const { x, y, fixed, fx, fy } = element.__data__;
  return { x, y, fixed, fx, fy };
});

async function settleLayout(page) {
  const coordinates = () => page.locator('#rendering-canvas circle[node_type="nucleotide"]')
    .evaluateAll(elements => elements.map(element => [element.__data__.x, element.__data__.y]));
  let previous = await coordinates();
  let stable = 0;
  for (let attempt = 0; attempt < 100; attempt++) {
    await page.waitForTimeout(100);
    const current = await coordinates();
    stable = current.every(([x, y], index) =>
      Math.hypot(x - previous[index][0], y - previous[index][1]) < 0.001) ? stable + 1 : 0;
    if (stable >= 5) return;
    previous = current;
  }
  assert.fail('The initial Force layout must settle before the recorded drag');
}

export default {
  id: 'release-positions', title: 'Release a moved node',
  zoom: false,
  placements: ['canvas-help:release', 'docs:additional-features'],
  parameters: { forceLayout: '1', textAnnotations: '[]' },
  description: 'With Force layout enabled, drag a node, open View controls, select it through Moved, and use Release to remove its manual fixation.',
  async prepare(page) {
    await settleLayout(page);
    const canvas = await page.locator('#rendering-canvas').boundingBox();
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.wheel(0, -250);
    await page.waitForTimeout(250);
    await page.mouse.move(35, 110);
  },
  async run(capture, page) {
    assert.equal(await page.locator('#forceLayout').isChecked(), true);
    const original = await position(node(page, 3));
    await capture.caption('With Force layout enabled, drag a node to fix its position');
    await capture.hold(2);
    await capture.drag(node(page, 3), -90, -70);
    const moved = await position(node(page, 3));
    assert.ok(Math.hypot(moved.x - original.x, moved.y - original.y) > 1,
      'The real drag must move the node');
    assert.ok(moved.fixed && moved.fx != null && moved.fy != null,
      'Dragging must fix the node before Release');
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 1/);
    assert.equal(await page.locator('#viewControlsToggle').getAttribute('aria-expanded'), 'false');
    await capture.caption('Open View controls on the right');
    await capture.click(page.locator('#viewControlsToggle'));
    assert.equal(await page.locator('#viewControlsToggle').getAttribute('aria-expanded'), 'true');
    await capture.caption('Click Moved to select the fixed node');
    await capture.hold(1.8);
    await capture.click(page.locator('#selectMovedBtn'));
    assert.equal(await selected(page), 1);
    assert.equal(await page.locator('#releasePositionsBtn').isDisabled(), false);
    await capture.caption('Click Release to remove the node’s manual fixation');
    await capture.hold(2);
    await capture.click(page.locator('#releasePositionsBtn'));
    assert.match(await page.locator('#selectMovedBtn').textContent(), /Moved: 0/);
    assert.equal(await page.locator('#resetPositionsBtn').isDisabled(), true);
    const released = await position(node(page, 3));
    assert.equal(Boolean(released.fixed || released.fx != null || released.fy != null), false);
    assert.ok(Number.isFinite(released.x) && Number.isFinite(released.y));
    await capture.caption('Manual fixation is removed; Moved returns to 0');
    await capture.hold(2);
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.3);
  },
};
