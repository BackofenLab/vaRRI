// Exercise real Vue controls and native modules, without a development build.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const catalog = require(path.join(root, 'example-data.js'));
const examples = catalog.default || catalog;
const output = path.join(root, 'output/playwright/ui');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

async function serve() {
  const server = http.createServer((request, response) => {
    const target = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://local').pathname));
    if (!target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(target, (error, content) => {
      response.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(target)] || 'text/plain' });
      response.end(error ? 'Not found' : content);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

const ready = page => page.waitForFunction(() =>
  document.getElementById('msg')?.textContent.includes('Visualisation ready') &&
  document.querySelector('#rendering-canvas circle[node_type="nucleotide"]'));

async function openPanel(page, selector) {
  const details = page.locator(selector).locator('xpath=ancestor::details[1]');
  if (await details.count() && !(await details.evaluate(element => element.open))) {
    await details.locator('summary').first().click();
  }
}

async function annotationCrud(page, fixture) {
  await openPanel(page, fixture.add);
  await page.locator(fixture.add).click();
  for (const [id, value] of Object.entries(fixture.fields)) await page.locator('#' + id).fill(value);
  await page.locator(`${fixture.dialog} button[value="ok"]`).click();
  await page.waitForFunction(selector => document.querySelectorAll(selector).length === 1, fixture.items);
  await ready(page);
  await page.locator(fixture.items + ' .highlight-item-main').click();
  await page.locator('#' + fixture.edit[0]).fill(fixture.edit[1]);
  await page.locator(`${fixture.dialog} button[value="ok"]`).click();
  await page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.textContent.includes(text),
    { selector: fixture.items, text: fixture.expected });
  await ready(page);
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const server = await serve();
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.VARRI_BROWSER_PATH ? { executablePath: process.env.VARRI_BROWSER_PATH } : {}) });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(origin) && response.status() >= 400) errors.push(response.url());
    });
    await page.route('**/*', route => route.request().url().startsWith(origin)
      ? route.continue() : route.fulfill({ status: 200, body: '' }));
    await page.goto(origin + '/index.html', { waitUntil: 'networkidle' });
    await ready(page);
    for (const [id, example] of Object.entries(examples)) {
      await openPanel(page, '#exampleDropdown');
      await page.locator('#exampleDropdownTrigger').click();
      await page.locator(`[data-example="${id}"]`).click();
      await ready(page);
      assert.equal(await page.locator('#sequence').inputValue(), example.vaRRIParams.sequence);
      assert.equal(await page.locator('#structure').inputValue(), example.vaRRIParams.structure);
      assert.ok(await page.locator('#rendering-canvas circle[node_type="nucleotide"]').count() > 0);
    }

    // A clean URL isolates dialog behavior from the catalog's annotations.
    const initial = new URLSearchParams({ sequence: 'ACGU&UGCA', structure: '((..&..))',
      highlighting: 'nothing', backgroundhighlighting: 'nothing', forceLayout: '0' });
    await page.goto(`${origin}/index.html?${initial}`, { waitUntil: 'networkidle' });
    await ready(page);
    await page.locator('#sequence').fill('AGGU&UGCA');
    await page.locator('#sequence').press('Tab');
    await ready(page);
    await page.waitForFunction(() => document.querySelector('#rendering-canvas circle[node_num="2"]')?.__data__?.name === 'G');

    await page.locator('#fastaInputBtn').click();
    await page.locator('#fastaInput').fill('>first\nACGU\n((..\n>second\nUGCA\n..))');
    await page.waitForFunction(() => document.getElementById('fastaSequence')?.value === 'ACGU&UGCA');
    await page.locator('#fastaDialog button[value="ok"]').click();
    await ready(page);
    assert.equal(await page.locator('#sequence').inputValue(), 'ACGU&UGCA');

    const annotations = [
      { add: '#highlightSubmitBtn', dialog: '#subseqHighlightDialog', items: '#highlight-list .highlight-item',
        fields: { subseqRange: '1-2' }, edit: ['subseqRange', '2-3'], expected: '2-3' },
      { add: '#regionSubmitBtn', dialog: '#regionHighlightDialog', items: '#region-list .highlight-item:not(.generated)',
        fields: { region1: '1-2', region2: '1-2' }, edit: ['region1', '2-3'], expected: '2-3&1-2' },
      { add: '#mutationSubmitBtn', dialog: '#mutationDialog', items: '#mutation-list .highlight-item',
        fields: { mutationPosition: '1', mutationBase: 'G' }, edit: ['mutationBase', 'U'], expected: 'U' },
    ];
    for (const fixture of annotations) await annotationCrud(page, fixture);

    await openPanel(page, '#profileData1');
    await page.locator('#profileData1').fill('1 0.2\n2 0.8');
    await page.locator('#profileApplyBtn').click();
    await ready(page);
    assert.equal((await page.locator('#profileCounterUI').textContent()).trim(), '(1)');
    await openPanel(page, '#forceLayoutLinearRRI');
    await page.locator('#forceLayoutLinearRRI').check();
    await ready(page);
    assert.equal(await page.locator('#forceLayout').isChecked(), true);
    await page.locator('#rotationSlider').evaluate(element => {
      element.value = '35';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText: async url => { window.sharedTestUrl = url; } },
    }));
    await page.locator('#shareLinkBtn').click();
    await page.waitForFunction(() => Boolean(window.sharedTestUrl));
    const shared = await page.evaluate(() => window.sharedTestUrl);
    const params = new URL(shared).searchParams;
    assert.equal(params.get('profileData1'), '1 0.2\n2 0.8');
    assert.equal(params.get('forceLayoutLinearRRI'), '1');
    assert.equal(params.get('rotation'), '35');
    for (const key of ['subseqHighlights', 'regionHighlights', 'mutations']) assert.ok(params.get(key), key + ' must be shared');
    await page.goto(origin + '/index.html?' + params, { waitUntil: 'networkidle' });
    await ready(page);
    for (const id of ['subseqCounterUI', 'regionCounterUI', 'mutationCounterUI', 'profileCounterUI']) {
      assert.equal((await page.locator('#' + id).textContent()).trim(), '(1)', id + ': restored state');
    }
    assert.equal(await page.locator('#forceLayoutLinearRRI').isChecked(), true);
    assert.equal(await page.locator('#rotationSlider').inputValue(), '0');
    assert.ok((await page.locator('#rotation').textContent()).includes('35'));
    assert.equal(await page.locator('#rendering-canvas svg').getAttribute('data-varri-rotation'), '35');

    for (const fixture of annotations) {
      await openPanel(page, fixture.add);
      await page.locator(fixture.items + ' .highlight-delete').click();
      await page.waitForFunction(selector => document.querySelectorAll(selector).length === 0, fixture.items);
      await ready(page);
    }
    for (const extension of ['svg', 'png']) {
      const download = page.waitForEvent('download');
      await page.locator(extension === 'svg' ? '#exportSvgBtn' : '#exportPngBtn').click();
      const target = path.join(output, 'viewer.' + extension);
      await (await download).saveAs(target);
      assert.ok(fs.statSync(target).size > 100, extension + ': UI export');
      if (extension === 'svg') assert.ok(fs.readFileSync(target, 'utf8').includes('data-varri-rotation="35"'));
      else assert.equal(fs.readFileSync(target).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    }
    params.set('showRenderingOnly', '1');
    await page.goto(origin + '/index.html?' + params, { waitUntil: 'networkidle' });
    await ready(page);
    assert.equal(await page.locator('.controls-column').isVisible(), false);
    assert.equal(await page.locator('#rendering-canvas').isVisible(), true);
    await page.evaluate(() => { window.open = url => { window.fullPageTestUrl = url; return null; }; });
    await page.locator('#openVarriBtn').click();
    const fullPage = new URL(await page.evaluate(() => window.fullPageTestUrl));
    assert.equal(fullPage.searchParams.has('showRenderingOnly'), false);
    assert.equal(fullPage.searchParams.get('sequence'), 'ACGU&UGCA');
    await page.screenshot({ path: path.join(output, 'render-only.png') });
    assert.deepEqual(errors, [], 'Browser errors during Vue UI workflow');
    await page.close();
    console.log('Vue browser UI passed: five examples, edits, FASTA, annotation CRUD, profiles, force, share roundtrip, export, render-only.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
