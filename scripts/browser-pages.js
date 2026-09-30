// Verify the native documentation controllers and user-visible page behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'output/playwright/pages');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png' };

async function serve() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + pathname);
    if (!target.startsWith(root + path.sep) || /^\/(dist|node_modules)\//.test(pathname)) {
      response.writeHead(403).end(); return;
    }
    fs.readFile(target, (error, body) => {
      response.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(target)] || 'text/plain' });
      response.end(error ? 'Not found' : body);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser, page;
  let phase = 'browser startup';
  const errors = [], modules = [];
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.VARRI_BROWSER_PATH ? { executablePath: process.env.VARRI_BROWSER_PATH } : {}) });
    page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(origin) && response.status() >= 400) errors.push(response.url());
    });
    page.on('request', request => { if (request.resourceType() === 'script') modules.push(request.url()); });
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    await page.route('**/*', route => route.request().url().startsWith(origin)
      ? route.continue() : route.fulfill({ status: 200, body: '' }));

    phase = 'composed README and legacy help anchors';
    await page.goto(origin + '/README.html#url-parameters--sharing', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#markdown-text #input-format-reference'));
    for (const id of ['overview-and-objective', 'region-highlights', 'probability-profiles',
      'url-parameters-sharing', 'input-format-reference', 'two-molecule-input', 'start-index']) {
      assert.equal(await page.locator('#markdown-text #' + id).count(), 1, 'Complete help section: ' + id);
    }
    await page.waitForFunction(() => Math.abs(document.getElementById('url-parameters-sharing').getBoundingClientRect().top) < 5);
    const brokenAnchors = await page.evaluate(() => [...document.querySelectorAll('#markdown-text a[href^="#"]')]
      .map(link => link.getAttribute('href')).filter(href => href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1)))));
    assert.deepEqual(brokenAnchors, [], 'Composed help links must target existing sections');
    await page.locator('#markdown-text a[href="#region-highlights"]').first().click();
    assert.equal(new URL(page.url()).hash, '#region-highlights');
    assert.equal(await page.locator('#markdown-text img').evaluateAll(images =>
      images.every(image => image.complete && image.naturalWidth > 0)), true, 'Help images resolve after guide extraction');
    await page.screenshot({ path: path.join(output, 'readme.png') });

    phase = 'citation tabs and downloads';
    await page.goto(origin + '/citation.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.getElementById('pre-bibtex')?.textContent.startsWith('@misc'));
    const bibtex = fs.readFileSync(path.join(root, 'CITATION.bib'), 'utf8');
    const cff = fs.readFileSync(path.join(root, 'CITATION.cff'), 'utf8');
    for (const [tab, filename] of [['bibtex', 'CITATION.bib'], ['cff', 'CITATION.cff'],
      ['apa', 'citation.txt'], ['ieee', 'citation.txt'], ['ris', 'citation.ris']]) {
      phase = 'citation ' + tab;
      await page.locator(`[data-tab="${tab}"]`).click();
      assert.equal(await page.locator('#content-' + tab).isVisible(), true, tab + ': selected panel');
      assert.equal(await page.locator('.tab-content.active').count(), 1, tab + ': one active format');
      const content = await page.locator('#pre-' + tab).textContent();
      if (tab === 'bibtex') assert.equal(content, bibtex);
      else if (tab === 'cff') assert.equal(content, cff);
      else {
        assert.ok(content.includes('vaRRI - Visual annotation of RNA-RNA interactions'), tab + ': title');
        assert.ok(content.includes('2026'), tab + ': year');
        assert.ok(content.includes('Raden, Martin and Ganter, Fabian'), tab + ': authors');
        if (tab === 'apa') assert.ok(content.includes('(2026).'));
        if (tab === 'ieee') assert.ok(content.includes('"vaRRI - Visual annotation'));
        if (tab === 'ris') assert.ok(content.startsWith('TY  - COMP\n') && content.endsWith('ER  -'));
      }
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator(`[data-download="${tab}"]`).click()]);
      assert.equal(download.suggestedFilename(), filename);
      const target = path.join(output, tab + '-' + filename);
      await download.saveAs(target);
      assert.equal(fs.readFileSync(target, 'utf8'), content, tab + ': downloaded format matches displayed data');
    }
    assert.ok(modules.some(url => url.endsWith('/src/ui/vendor/marked.js')), 'README uses the pinned local ESM parser');
    assert.ok(modules.every(url => url.startsWith(origin + '/src/')), 'Page scripts are native source modules');
    assert.deepEqual(errors, [], 'Ancillary page browser errors');
    await page.screenshot({ path: path.join(output, 'citation.png') });
    console.log(`Native pages passed (Chromium ${browser.version()}): complete help, anchors, images, citation tabs and five downloads.`);
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(output, 'failure.html'), await page.content().catch(() => ''));
    }
    fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ phase, message: error.message, errors, modules }, null, 2));
    throw error;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
