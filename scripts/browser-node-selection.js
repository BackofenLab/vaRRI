import assert from 'node:assert/strict';

const point = locator => locator.evaluate(element => {
  const m = element.getScreenCTM(); return { x: m.e, y: m.f };
});
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 0.6, `${message}: ${a} vs ${b}`);

/** Check nucleotide-only bounds and both platform modifiers in each UI browser. */
export async function exerciseNodeSelection(page) {
  const host = page.locator('#rendering-canvas'), svg = host.locator('svg');
  const circle = host.locator('circle[node_type="nucleotide"]').nth(1);
  const node = circle.locator('..');
  const other = host.locator('circle[node_type="nucleotide"]').nth(2).locator('..');
  const initial = await point(node);
  await page.mouse.click(initial.x, initial.y);
  const box = await circle.evaluate(element => element.getBoundingClientRect().toJSON());
  const group = await node.evaluate(element => element.getBoundingClientRect().toJSON());
  assert.ok(group.width > box.width + 1 || group.height > box.height + 1, 'Fixture has an attached direction arrow');
  for (const modifier of ['Control', 'Meta']) {
    await page.keyboard.down(modifier);
    await page.mouse.click(initial.x, initial.y);
    await page.keyboard.up(modifier);
    assert.equal(await host.locator('[data-varri-selected]').count(), 1, `${modifier}-click selects`);
    const outline = await host.locator('[data-varri-interaction-overlay] rect').evaluate(element => {
      // Firefox includes stroke in getBoundingClientRect; compare the outline path itself.
      const box = element.getBBox(), matrix = element.getScreenCTM();
      const start = new DOMPoint(box.x, box.y).matrixTransform(matrix);
      const end = new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(matrix);
      return { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y };
    });
    near(outline.x, box.x - 2, 'Selection outlines the nucleotide left edge');
    near(outline.y, box.y - 2, 'Selection outlines the nucleotide top edge');
    near(outline.width, box.width + 4, 'Selection excludes the direction arrow width');
    near(outline.height, box.height + 4, 'Selection excludes the direction arrow height');
    await page.keyboard.down(modifier);
    await page.mouse.click(initial.x, initial.y);
    await page.keyboard.up(modifier);
    assert.equal(await host.locator('[data-varri-selected]').count(), 0, `${modifier}-click toggles off`);

    // A tight rectangle encloses the circle but deliberately excludes its arrow.
    await page.keyboard.down(modifier);
    await page.mouse.move(box.x - 1, box.y - 1);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width + 1, box.y + box.height + 1, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up(modifier);
    assert.equal(await node.getAttribute('data-varri-selected'), 'true', `${modifier}-rectangle uses nucleotide bounds`);

    const second = await point(other);
    await page.keyboard.down(modifier);
    await page.mouse.click(second.x, second.y);
    await page.keyboard.up(modifier);
    assert.equal(await host.locator('[data-varri-selected]').count(), 2);
    const zoom = await svg.evaluate(element => ({ ...element.__zoom }));
    const bounds = await svg.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.keyboard.down(modifier);
    await page.mouse.wheel(0, 90);
    await page.keyboard.up(modifier);
    await page.waitForTimeout(250);
    const rotated = await point(node);
    assert.ok(Math.hypot(rotated.x - initial.x, rotated.y - initial.y) > 1, `${modifier}-wheel rotates`);
    assert.deepEqual(await svg.evaluate(element => ({ ...element.__zoom })), zoom, `${modifier}-wheel does not zoom`);
    await page.keyboard.press(`${modifier}+z`);
    const restored = await point(node);
    near(restored.x, initial.x, `${modifier}+Z restores x`);
    near(restored.y, initial.y, `${modifier}+Z restores y`);
    await page.keyboard.down(modifier);
    await page.mouse.click(bounds.x + 5, bounds.y + 5);
    await page.keyboard.up(modifier);
    assert.equal(await host.locator('[data-varri-selected]').count(), 0, `${modifier}-background click clears`);
  }
}
