import assert from 'node:assert/strict';

export async function checkExampleDropdownOverlay(page) {
  const dropdown = page.locator('#exampleDropdown');
  const trigger = page.locator('#exampleDropdownTrigger');
  const options = page.locator('#exampleDropdownOptions');
  const sequence = page.locator('#sequence');
  const before = await sequence.boundingBox();

  await trigger.click();
  await page.waitForFunction(() => document.getElementById('exampleDropdown')?.open);

  const after = await sequence.boundingBox();
  const optionBounds = await options.boundingBox();
  const optionPosition = await options.evaluate(element => getComputedStyle(element).position);
  assert.ok(before && after && optionBounds, 'Example menu and sequence input must have measurable bounds');
  assert.equal(after.y, before.y, 'Opening examples must not move sequence inputs');
  assert.equal(optionPosition, 'absolute', 'Example choices must overlay the form');
  assert.ok(optionBounds.y + optionBounds.height > after.y, 'Open choices must extend over the stable form');

  await dropdown.press('Escape');
  await page.waitForFunction(() => !document.getElementById('exampleDropdown')?.open);
}
