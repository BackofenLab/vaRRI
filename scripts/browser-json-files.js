import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const storedState = page => page.evaluate(async () => {
  const { default: viewer } = await import('/index.js');
  return JSON.parse(viewer.actions.generateJSON());
});
const waitForLoad = page => page.waitForFunction(() =>
  document.getElementById('sequence').value === 'ACGU&UGCA' &&
  document.getElementById('rendering-canvas').style.visibility !== 'hidden' &&
  document.querySelector('#rendering-canvas circle[node_num="8"]'));

export async function checkJSONFiles(page, origin, output) {
  const params = new URLSearchParams({ sequence: 'ACGU&UGCA', structure: '((..&..))',
    startIndex1: '-2', startIndex2: '100', seqName1: 'α & first', seqName2: 'second',
    forceLayout: '0', forceLayoutLinearRRI: '1', rotation: '-25', backgroundhighlighting: 'region',
    profileData1: '-2 0.2\n-1 0.8', profileIdxRef1: 'start',
    mutations: '1:-1G:006400', subseqHighlights: '1:-2--1,1-2:800080:0.4',
    regionHighlights: '-2--1&100-101:ff0000:0.3',
    textAnnotations: JSON.stringify([{ text: 'α: <note> & label', bold: true, italic: true,
      size: 19, color: 'navy', position: { x: -12, y: 8 } }]) });
  await page.goto(`${origin}/index.html?${params}`, { waitUntil: 'networkidle' });
  await waitForLoad(page);
  const before = await storedState(page);
  assert.equal(before.fields.profileIdxRef1, 'start');
  assert.equal(before.annotations.regionHighlights.length, 1, 'Generated regions are not saved');
  assert.ok(before.annotations.textAnnotations.length >= 2, 'Sequence-name labels are saved');
  assert.equal(await page.locator('#storeJsonBtn').evaluate(button => button.nextElementSibling.id), 'shareLinkBtn');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Store', exact: true }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'vaRRI_session.json');
  const filename = path.join(output, 'session.json');
  await download.saveAs(filename);
  assert.deepEqual(JSON.parse(fs.readFileSync(filename, 'utf8')), before);

  await page.goto(`${origin}/index.html`, { waitUntil: 'networkidle' });
  const inputPanel = page.locator('#loadJsonBtn').locator('xpath=ancestor::details[1]');
  const wasOpen = await inputPanel.evaluate(element => element.open);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load', exact: true }).focus();
  await page.keyboard.press('Enter');
  const chooser = await chooserPromise;
  assert.equal(await inputPanel.evaluate(element => element.open), wasOpen, 'Load must not toggle its section');
  await chooser.setFiles(filename);
  await waitForLoad(page);
  assert.deepEqual(await storedState(page), before, 'Picker restores settings and annotations');

  const saved = fs.readFileSync(filename, 'utf8');
  await page.locator('#loadJsonBtn').dispatchEvent('drop', {
    dataTransfer: await page.evaluateHandle(text => {
      const data = new DataTransfer();
      data.items.add(new File([text], 'session.json', { type: 'application/json' }));
      return data;
    }, saved.replace('α & first', 'Dropped strand')),
  });
  await page.waitForFunction(() => document.getElementById('seqName1').value === 'Dropped strand');
  await waitForLoad(page);
  const dropped = await storedState(page);
  assert.equal(dropped.fields.seqName1, 'Dropped strand');
  await page.locator('#loadJsonInput').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await page.waitForFunction(() => document.getElementById('msg').textContent.includes('not valid JSON'));
  assert.deepEqual(await storedState(page), dropped, 'Invalid files preserve the current figure');
  await page.locator('#loadJsonInput').setInputFiles(filename);
  await page.waitForFunction(() => document.getElementById('seqName1').value === 'α & first');
  await waitForLoad(page);
  assert.deepEqual(await storedState(page), before, 'The same file can be selected again');

  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const selector of ['#loadJsonBtn', '#full-screen-menu']) {
      const layout = await page.locator(selector).evaluate(control => {
        const header = control.closest('summary');
        const box = header.getBoundingClientRect();
        const action = control.getBoundingClientRect();
        const title = header.querySelector('span').getBoundingClientRect();
        return { expected: box.right - parseFloat(getComputedStyle(header).paddingRight), right: action.right,
          left: action.left, titleRight: title.right, viewport: innerWidth };
      });
      assert.ok(Math.abs(layout.right - layout.expected) < 2, `${selector} is right aligned at ${width}px`);
      assert.ok(layout.left >= layout.titleRight, `${selector} does not overlap its heading at ${width}px`);
      assert.ok(layout.right <= layout.viewport, `${selector} stays within the viewport`);
    }
    const settings = page.locator('#full-screen-menu').locator('xpath=ancestor::details[1]');
    const settingsOpen = await settings.evaluate(element => element.open);
    await page.locator('label[for="hideFooterAndHeader"]').click();
    assert.equal(await settings.evaluate(element => element.open), settingsOpen, 'Full Screen must not toggle its section');
    assert.equal(await page.locator('#hideFooterAndHeader').isChecked(), true);
    await page.locator('label[for="hideFooterAndHeader"]').click();
    await page.screenshot({ path: path.join(output, `json-session-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}
