import assert from 'node:assert/strict';

export async function checkFastaInput(page) {
  const sequence = page.locator('#sequence');
  const dialog = page.locator('#fastaDialog');
  const draft = dialog.locator('#fastaInput');
  const source = '  >first description\nACGU\n((..\n>second\nUGCA\n..))\n';

  // Copy in the manual dialog so a real paste also exercises focus and blur.
  await page.locator('#fastaInputBtn').click();
  const manual = await dialog.boundingBox();
  await draft.fill(source);
  await draft.press('ControlOrMeta+a');
  await draft.press('ControlOrMeta+c');
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  const malformed = '>missing sequence';
  await sequence.fill(malformed);
  await sequence.press('Tab');
  assert.equal(await sequence.inputValue(), malformed);
  assert.equal(await dialog.isVisible(), false);
  await sequence.hover();
  const error = page.locator('#sequence ~ .field-tooltip');
  await error.waitFor({ state: 'visible' });
  assert.match(await error.textContent(), /IUPAC/);
  const fontSize = element => getComputedStyle(element).fontSize;
  const heading = page.locator('summary').filter({ hasText: 'Sequence & Structure Input' });
  assert.equal(await error.evaluate(fontSize), await heading.evaluate(fontSize));

  await sequence.press('ControlOrMeta+a');
  await sequence.press('ControlOrMeta+v');
  await dialog.waitFor({ state: 'visible' });
  const automatic = await dialog.boundingBox();
  assert.ok(Math.abs(automatic.x - manual.x) <= 1 && Math.abs(automatic.y - manual.y) <= 1,
    'Pasting opens the dialog at the FASTA button');
  assert.equal(await sequence.inputValue(), '');
  assert.equal(await draft.inputValue(), source);
  assert.equal(await dialog.locator('#fastaSequence').inputValue(), 'ACGU&UGCA');
  assert.equal(await dialog.locator('#fastaStructure').inputValue(), '((..&..))');
  assert.equal(await dialog.locator('#fastaSeqName1').inputValue(), 'first');
  assert.equal(await dialog.locator('#fastaSeqName2').inputValue(), 'second');
  await dialog.getByRole('button', { name: 'OK' }).click();
  assert.equal(await sequence.inputValue(), 'ACGU&UGCA');
  assert.equal(await page.locator('#structure').inputValue(), '((..&..))');
}
