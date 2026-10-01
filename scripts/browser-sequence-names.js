import assert from 'node:assert/strict';
import path from 'node:path';

/** Review #92: sequence names stay synchronized across every editing surface. */
export async function exerciseSequenceNames(page, origin, output) {
  const params = new URLSearchParams({ sequence: 'ACGU&UGCA', structure: '((..&..))',
    seqName1: 'RNA α', seqName2: 'Target β', forceLayout: '0',
    highlighting: 'nothing', backgroundhighlighting: 'nothing' });
  const canvas = page.locator('#rendering-canvas');
  const row = number => page.locator(`[data-sequence-name-for="${number}"]`);
  const open = async selector => {
    const panel = page.locator(selector).locator('xpath=ancestor::details[1]');
    if (!await panel.evaluate(element => element.open)) await panel.locator(':scope > summary').click();
  };
  const ready = () => page.waitForFunction(() =>
    document.querySelector('#rendering-canvas circle[node_type="nucleotide"]') &&
    document.getElementById('rendering-canvas').style.visibility !== 'hidden');
  const records = () => page.evaluate(async () => {
    const { default: view } = await import('/index.js');
    return JSON.parse(JSON.stringify(view.state.annotations.texts));
  });
  await page.goto(`${origin}/index.html?${params}`, { waitUntil: 'networkidle' });
  await ready();
  assert.deepEqual(await canvas.locator('[data-varri-text] text').allTextContents(), ['RNA α', 'Target β']);
  const panels = await page.locator('.controls-column details > summary').allTextContents();
  const settingsIndex = panels.findIndex(text => text.includes('Visualization Settings'));
  assert.ok(settingsIndex >= 0);
  assert.ok(panels[settingsIndex + 1].includes('Text Annotations'), 'Text annotations immediately follow settings');
  assert.ok(panels[settingsIndex + 2].includes('Region Highlights'));

  await open('#seqName1');
  const namesGroup = page.getByRole('group', { name: 'Sequence Names', exact: true });
  assert.equal(await namesGroup.getByRole('textbox', { name: 'Sequence 1 name' }).count(), 1);
  assert.equal(await namesGroup.getByRole('textbox', { name: 'Sequence 2 name' }).count(), 1);
  assert.equal(await page.locator('#seqName1').inputValue(), 'RNA α');
  assert.equal(await page.locator('#seqName2').inputValue(), 'Target β');
  const backgrounds = await page.locator('#seqName1, #seqName2').evaluateAll(nodes =>
    nodes.map(node => getComputedStyle(node).backgroundColor));
  assert.notEqual(backgrounds[0], backgrounds[1], 'Names identify their strand by background color');
  assert.ok(backgrounds.every(color => color !== 'rgba(0, 0, 0, 0)'));
  await canvas.locator('svg').evaluate(node => { node.dataset.nameEditProbe = 'same'; });
  await page.locator('#seqName1').fill('Field edited α');
  await page.locator('#seqName1').press('Tab');
  await page.waitForFunction(() => [...document.querySelectorAll('#rendering-canvas [data-varri-text] text')]
    .some(node => node.textContent === 'Field edited α'));
  assert.equal(await canvas.locator('svg').getAttribute('data-name-edit-probe'), 'same', 'Renaming preserves the live RNA graph');
  await page.screenshot({ path: path.join(output, 'sequence-name-inputs.png'), fullPage: true });

  await open('#textAnnotationSubmitBtn');
  assert.equal(await row('1').count(), 1);
  assert.match(await row('1').locator('.text-annotation-kind').textContent(), /Sequence 1/);
  const first = (await records()).find(item => item.sequenceNameFor === '1');
  await row('1').locator('.text-annotation-preview').click();
  await page.locator('#textAnnotationText').fill('Cancelled draft');
  await page.locator('#textAnnotationSize').fill('0');
  await page.locator('#textAnnotationDialog button[value="cancel"]').click();
  assert.equal(await page.locator('#textAnnotationDialog').evaluate(element => element.open), false,
    'Cancel closes the dialog even when a draft violates native size validation');
  assert.equal(await page.locator('#seqName1').inputValue(), 'Field edited α');
  await row('1').locator('.text-annotation-preview').click();
  await page.locator('#textAnnotationText').fill('Dialog edited γ');
  await page.locator('#textAnnotationItalic').check();
  await page.locator('#textAnnotationColor').fill('#173c8f');
  await page.screenshot({ path: path.join(output, 'sequence-name-dialog.png'), fullPage: true });
  await page.locator('#textAnnotationDialog button[value="ok"]').click();
  assert.equal(await page.locator('#seqName1').inputValue(), 'Dialog edited γ');
  const edited = (await records()).find(item => item.sequenceNameFor === '1');
  assert.equal(edited.id, first.id);
  assert.deepEqual(edited.position, first.position);
  assert.deepEqual(edited.anchor, first.anchor);
  assert.equal(edited.italic, true);
  assert.equal(edited.color, '#173c8f');
  assert.equal(await canvas.locator('svg').getAttribute('data-name-edit-probe'), 'same');

  await row('1').locator('.highlight-delete').click();
  assert.equal(await row('1').count(), 1, 'Trash keeps the sequence-name entry');
  assert.equal(await row('1').locator('[aria-label="Unpositioned"]').count(), 1);
  assert.equal(await canvas.locator(`[data-varri-text="${first.id}"]`).count(), 0);
  const hidden = (await records()).find(item => item.sequenceNameFor === '1');
  assert.equal(hidden.position, null);
  assert.equal(hidden.anchor, null);
  const shared = await page.evaluate(async () => (await import('/index.js')).default.actions.generateShareableURL());
  assert.equal(new URL(shared).searchParams.get('seqName1'), 'Dialog edited γ');
  assert.equal(new URL(shared).searchParams.get('seqName2'), 'Target β');
  assert.equal(new URL(shared).searchParams.has('seq1name'), false);
  assert.equal(new URL(shared).searchParams.has('seq2name'), false);
  await page.goto(shared, { waitUntil: 'networkidle' });
  await ready();
  await open('#textAnnotationSubmitBtn');
  assert.equal(await row('1').locator('[aria-label="Unpositioned"]').count(), 1, 'Shared name remains unpositioned');
  await row('1').locator('.text-annotation-preview').dragTo(canvas, { targetPosition: { x: 220, y: 100 } });
  await page.waitForFunction(() => document.querySelector('[data-sequence-name-for="1"] [aria-label="Positioned"]'));
  assert.equal(await page.locator('#seqName1').inputValue(), 'Dialog edited γ');
  await row('1').locator('.text-annotation-preview').click();
  await page.locator('#textAnnotationText').fill('Moved name δ');
  await page.locator('#textAnnotationDialog button[value="ok"]').click();
  assert.equal(await page.locator('#seqName1').inputValue(), 'Moved name δ', 'Name identity survives manual placement');

  // FASTA name edits are drafts until OK and must survive its revalidation.
  await open('#fastaInputBtn');
  await page.locator('#fastaInputBtn').click();
  const fasta = '>header_one description with spaces\nACGU\n((..\n>header_two\tother description\nUGCA\n..))';
  await page.locator('#fastaInput').fill(fasta);
  assert.equal(await page.locator('#fastaSeqName1').inputValue(), 'header_one');
  assert.equal(await page.locator('#fastaSeqName2').inputValue(), 'header_two');
  await page.locator('#fastaSeqName1').fill('Cancelled FASTA name');
  await page.locator('#fastaDialog button[value="cancel"]').click();
  assert.equal(await page.locator('#seqName1').inputValue(), 'Moved name δ');
  await page.locator('#fastaInputBtn').click();
  await page.locator('#fastaInput').fill(fasta);
  await page.locator('#fastaSeqName1').fill('Imported α & guide');
  await page.locator('#fastaSeqName2').fill('Imported target β');
  await page.screenshot({ path: path.join(output, 'fasta-sequence-names.png'), fullPage: true });
  await page.locator('#fastaDialog button[value="ok"]').click();
  await ready();
  assert.equal(await page.locator('#seqName1').inputValue(), 'Imported α & guide');
  assert.equal(await page.locator('#seqName2').inputValue(), 'Imported target β');
  assert.equal(await page.locator('#sequence').inputValue(), 'ACGU&UGCA');
  assert.deepEqual((await records()).filter(item => item.sequenceNameFor).map(item => item.text),
    ['Imported α & guide', 'Imported target β']);
  assert.deepEqual(await canvas.locator('[data-varri-text] text').allTextContents(),
    ['Imported α & guide', 'Imported target β']);
  const imported = await page.evaluate(async () => (await import('/index.js')).default.actions.generateShareableURL());
  const restoredParams = new URL(imported).searchParams;
  assert.equal(restoredParams.get('seqName1'), 'Imported α & guide');
  assert.equal(restoredParams.get('seqName2'), 'Imported target β');
  assert.equal(restoredParams.has('fastaSeqName1'), false);
  await open('#textAnnotationSubmitBtn');
  await page.screenshot({ path: path.join(output, 'sequence-name-annotations.png'), fullPage: true });
}
