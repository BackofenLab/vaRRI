// Smoke-test a served, installed package with the project's Playwright Chromium.
// Usage: node scripts/browser-smoke.js http://127.0.0.1:8080 /tmp/varri-browser-results
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [baseArgument, outputArgument] = process.argv.slice(2);
assert.ok(baseArgument && outputArgument, 'Provide the served package URL and output directory.');
const base = baseArgument.replace(/\/$/, '');
const output = path.resolve(outputArgument);
fs.mkdirSync(output, { recursive: true });

const browser = await chromium.launch({ headless: true,
  ...(process.env.VARRI_BROWSER_PATH ? { executablePath: process.env.VARRI_BROWSER_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const errors = [], missingLocal = [], externalFailures = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('response', response => {
  if (response.url().startsWith(base + '/') && response.status() >= 400) missingLocal.push(response.url());
});
page.on('requestfailed', request => {
  (request.url().startsWith(base + '/') ? missingLocal : externalFailures).push(request.url());
});

try {
  await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
  await page.locator('#exampleDropdownTrigger').click();
  const examples = page.locator('#exampleDropdownOptions [data-example]');
  assert.ok(await examples.count(), 'Packaged example catalog is missing');
  await examples.first().click();
  await page.waitForSelector('#rendering-canvas svg');
  await page.waitForFunction(() => document.querySelectorAll('#rendering-canvas svg circle').length > 0);
  for (const [extension, button] of [['svg', '#exportSvgBtn'], ['png', '#exportPngBtn']]) {
    const pendingDownload = page.waitForEvent('download');
    await page.locator(button).click();
    const download = await pendingDownload;
    const target = path.join(output, `render.${extension}`);
    await download.saveAs(target);
    const contents = fs.readFileSync(target);
    assert.ok(contents.length > 100, `${extension} export is empty`);
    if (extension === 'png') assert.ok(contents.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')));
    else assert.ok(contents.toString('utf8').includes('<svg'));
  }
  await page.screenshot({ path: path.join(output, 'viewer.png'), fullPage: true });
  await page.goto(base + '/README.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#markdown-text h1');
  await page.goto(base + '/citation.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#pre-bibtex')?.textContent.includes('@'));
  assert.deepEqual(missingLocal, [], `Missing package assets: ${missingLocal.join(', ')}`);
  assert.deepEqual(errors, [], `Browser errors: ${errors.join(', ')}`);
  console.log(JSON.stringify({ result: 'passed',
    checks: ['example rendering', 'SVG', 'PNG', 'README', 'citation'],
    external_request_failures: externalFailures,
  }, null, 2));
} finally {
  await browser.close();
}
