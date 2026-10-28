import assert from 'node:assert/strict';

// Indices here are zero-based DOM order, not biological nucleotide positions.
export const node = (page, index) => page.locator('#rendering-canvas circle[node_type="nucleotide"]').nth(index);
export const selected = page => page.locator('#rendering-canvas [data-varri-selected]').count();
export const near = (a, b) => assert.ok(Math.abs(a - b) < 1, `Expected ${a} to be close to ${b}`);

export async function selectPair(capture, page) {
  await capture.caption('Ctrl / ⌘ + click to select nodes');
  await capture.hold(1);
  await capture.click(node(page, 3), 'Control');
  await capture.click(node(page, 4), 'Control');
  assert.equal(await selected(page), 2, 'Both nodes must actually be selected');
}

export async function openPanel(page, selector) {
  const details = page.locator(selector).locator('xpath=ancestor::details[1]');
  if (await details.count() && !(await details.evaluate(element => element.open))) {
    await details.locator('summary').click();
  }
  await details.evaluate(element => element.scrollIntoView({ block: 'nearest' }));
}

export const ready = page => page.waitForFunction(() =>
  document.getElementById('rendering-canvas')?.style.visibility !== 'hidden' &&
  document.querySelector('#rendering-canvas circle[node_type="nucleotide"]'));
