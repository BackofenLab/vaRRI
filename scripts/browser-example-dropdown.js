import assert from 'node:assert/strict';

export async function checkExampleDropdownOverlay(page) {
  const dropdown = page.locator('#exampleDropdown');
  const trigger = page.locator('#exampleDropdownTrigger');
  const options = page.locator('#exampleDropdownOptions');
  const sequence = page.locator('#sequence');
  const before = await sequence.boundingBox();

  // The native open property changes before its queued toggle event updates Vue.
  const opened = dropdown.evaluate(element => new Promise(resolve =>
    element.addEventListener('toggle', () => resolve(element.open), { once: true })));
  await trigger.click();
  assert.equal(await opened, true, 'The open toggle has reached the application');

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
