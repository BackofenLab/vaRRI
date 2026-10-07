import assert from 'node:assert/strict';

/** Marquee selection uses full screen bounds, including counterrotated labels. */
export async function exerciseRectangleSelection(page, host) {
  const svg = host.locator('svg');
  const box = await svg.boundingBox();
  const bounds = await host.locator('g.gnode, [data-varri-text]').evaluateAll(elements => elements.map((element, i) => {
    element.setAttribute('data-test-target', i);
    const { left, right, top, bottom } = (element.querySelector('circle[node_type="nucleotide"]') || element).getBoundingClientRect();
    return { i, left, right, top, bottom };
  }));
  const left = box.x + 10, top = box.y + 10;
  const right = box.x + box.width - 10, bottom = box.y + box.height - 10;
  const expected = bounds.filter(b => b.left >= left && b.right <= right && b.top >= top && b.bottom <= bottom)
    .map(b => String(b.i));
  assert.ok(expected.length > 4, 'Rectangle fixture contains several objects');
  const firstViewer = await page.locator('#first').innerHTML();
  const plot = await host.locator('.fornac-plot').getAttribute('transform');
  for (const [reverse, modifier] of [[false, 'Control'], [true, 'Meta']]) {
    await page.keyboard.down(modifier);
    await page.mouse.move(reverse ? right : left, reverse ? bottom : top);
    await page.mouse.down();
    await page.mouse.move(reverse ? left : right, reverse ? top : bottom, { steps: 6 });
    assert.equal(await host.locator('[data-varri-interaction-overlay] [stroke-dasharray]').count(), 1,
      'Marquee is drawn during the gesture');
    await page.mouse.up();
    await page.keyboard.up(modifier);
    assert.deepEqual(await host.locator('[data-varri-selected]').evaluateAll(elements =>
      elements.map(element => element.getAttribute('data-test-target'))), expected, 'Rectangle selects every fully enclosed element');
    assert.equal(await host.locator('.fornac-plot').getAttribute('transform'), plot, 'Ctrl-drag does not pan');
  }
  assert.equal(await page.locator('#first').innerHTML(), firstViewer, 'Selection is isolated to its viewer');

  const partial = bounds.find(b => b.left > left + 10 && b.right < right && b.top > top + 10 && b.bottom < bottom);
  assert.ok(partial);
  const cutoff = (partial.left + partial.right) / 2;
  await page.keyboard.down('Control');
  await page.mouse.move(left, top);
  await page.mouse.down();
  await page.mouse.move(cutoff, bottom, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up('Control');
  assert.equal(await host.locator(`[data-test-target="${partial.i}"][data-varri-selected]`).count(), 0,
    'Partly intersecting objects are excluded');

  await page.keyboard.down('Control');
  await page.mouse.move(left, top);
  await page.mouse.down();
  await page.mouse.move(left + 3, top + 3);
  await page.mouse.up();
  await page.keyboard.up('Control');
  assert.equal(await host.locator('[data-varri-selected]').count(), 0, 'An empty rectangle clears selection');
  await host.locator('[data-test-target]').evaluateAll(elements => elements.forEach(element => element.removeAttribute('data-test-target')));
}
