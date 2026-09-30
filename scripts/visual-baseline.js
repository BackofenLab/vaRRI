import { pathToFileURL } from 'node:url';
// Browser regression fixtures are recorded explicitly, never during a normal test.
// npm run test:visual -- --update --root /tmp/varri-original --revision <git-sha>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { chromium } from 'playwright';
import { createCanvas, loadImage } from 'canvas';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(option('--root', path.join(import.meta.dirname, '..')));
const baseline = path.resolve(option('--baseline', path.join(import.meta.dirname, '../tests/visual-core')));
const output = path.resolve(option('--output', path.join(import.meta.dirname, '../output/playwright')));
const update = args.includes('--update');
const revision = option('--revision', null);
const fixtures = ['2mol', 'coronel-tellez-2022', 'wu-2024', 'IntaRNA-seeds', 'crossing-rri'];
const catalog = await import(pathToFileURL(path.join(root, 'example-data.js')).href);
const examples = catalog.default || catalog;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serve() {
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + relative);
    if (!target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(target, (error, content) => {
      response.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(target)] || 'text/plain' });
      response.end(error ? 'Not found' : content);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function pixels(file) {
  const image = await loadImage(file);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  return { width: image.width, height: image.height,
    data: context.getImageData(0, 0, image.width, image.height).data };
}

async function compareImage(name) {
  const expected = await pixels(path.join(baseline, name + '.png'));
  const actual = await pixels(path.join(output, name + '.png'));
  assert.equal(actual.width, expected.width, name + ': canvas width changed');
  assert.equal(actual.height, expected.height, name + ': canvas height changed');
  let different = 0;
  for (let index = 0; index < actual.data.length; index += 4) {
    if ([0, 1, 2, 3].some(channel => Math.abs(actual.data[index + channel] - expected.data[index + channel]) > 24)) {
      different += 1;
    }
  }
  // Permit minor platform antialiasing, but not missing nucleotides or annotations.
  const ratio = different / (actual.width * actual.height);
  assert.ok(ratio <= 0.002, `${name}: ${(ratio * 100).toFixed(3)}% changed pixels (limit 0.2%). Compare ${path.join(output, name + '.png')} with ${path.join(baseline, name + '.png')}`);
  return ratio;
}

function compareScene(name, actual, expected) {
  assert.deepEqual(actual.counts, expected.counts, name + ': SVG element counts changed');
  assert.equal(actual.shapes.length, expected.shapes.length, name + ': SVG shape count changed');
  const index = actual.shapes.findIndex((shape, position) => !isDeepStrictEqual(shape, expected.shapes[position]));
  if (index !== -1) assert.deepEqual(actual.shapes[index], expected.shapes[index],
    `${name}: SVG shape ${index} changed; full actual scene: ${path.join(output, name + '.json')}`);
}

function scene() {
  const svg = document.querySelector('#rendering-canvas svg');
  const round = value => Number(Number(value).toFixed(2));
  const shapes = Array.from(svg.querySelectorAll('circle, line, polygon, polyline, path, text')).map(element => {
    const matrix = element.getCTM();
    const style = getComputedStyle(element);
    const attributes = {};
    for (const key of ['cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'd', 'node_num']) {
      if (element.hasAttribute(key)) attributes[key] = element.getAttribute(key);
    }
    return { tag: element.tagName, attributes,
      transform: matrix ? [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].map(round) : null,
      fill: style.fill, stroke: style.stroke, width: style.strokeWidth, opacity: style.opacity,
      text: element.tagName === 'text' ? element.textContent : null };
  });
  return { shapes, counts: {
    nucleotides: svg.querySelectorAll('circle[node_num]').length,
    links: svg.querySelectorAll('line').length,
    regions: svg.querySelectorAll('[data-varri-region]').length,
    subsequences: svg.querySelectorAll('[data-varri-subseq]').length,
  } };
}

async function main() {
  assert.ok(!update || revision, 'Baseline updates require --revision identifying the reviewed source');
  fs.mkdirSync(output, { recursive: true });
  if (update) fs.mkdirSync(baseline, { recursive: true });
  const server = await serve();
  let browser, activePage, currentFixture;
  let browserErrors = [];
  const results = [];
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.VARRI_BROWSER_PATH ? { executablePath: process.env.VARRI_BROWSER_PATH } : {}) });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const name of fixtures) {
      currentFixture = name;
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
      activePage = page;
      const errors = [];
      browserErrors = errors;
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.url().startsWith(origin) && response.status() >= 400) errors.push(response.url());
      });
      page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
      // External branding and Markdown CDN are irrelevant to the RNA canvas baseline.
      await page.route('**/*', route => route.request().url().startsWith(origin)
        ? route.continue() : route.fulfill({ status: 200, body: '' }));
      await page.addInitScript(() => {
        let seed = 83;
        Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      });
      const parameters = new URLSearchParams({ ...examples[name].vaRRIParams,
        forceLayout: '0', forceLayoutLinearRRI: '0', forceLayoutLinearStructure: '0',
        freeTrailingEnds: '0', pullPseudoknotBasepairs: '0' });
      await page.goto(`${origin}/index.html?${parameters}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('#rendering-canvas circle[node_num]') &&
        document.getElementById('rendering-canvas')?.style.visibility !== 'hidden');
      if (await page.locator('script[type="module"][src="src/main.js"]').count()) {
        assert.equal(await page.evaluate(async () => {
          const entry = await import('./src/main.js');
          const core = await import('varri');
          return entry.vaRRI === core.default && typeof core.default.render === 'function';
        }), true, name + ': native entry point must resolve the import map core API');
      }
      const snapshot = await page.evaluate(scene);
      assert.ok(snapshot.counts.nucleotides > 0, name + ': no RNA nucleotides rendered');
      assert.deepEqual(errors, [], name + ': browser errors');
      await page.locator('#rendering-canvas').screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' });
      fs.writeFileSync(path.join(output, name + '.json'), JSON.stringify(snapshot) + '\n');
      if (update) {
        for (const extension of ['png', 'json']) fs.copyFileSync(path.join(output, `${name}.${extension}`), path.join(baseline, `${name}.${extension}`));
        results.push({ name, ...snapshot.counts });
      } else {
        const expected = JSON.parse(fs.readFileSync(path.join(baseline, name + '.json'), 'utf8'));
        const changedPixelRatio = await compareImage(name);
        compareScene(name, snapshot, expected);
        results.push({ name, ...snapshot.counts, changedPixelRatio });
      }
      await page.close();
    }
    if (update) fs.writeFileSync(path.join(baseline, 'manifest.json'), JSON.stringify({
      revision, browser: browser.version(), viewport: { width: 1440, height: 1000 }, seed: 83,
      forceLayout: false, fixtures: results,
    }, null, 2) + '\n');
    console.log(JSON.stringify({ result: 'passed', browser: browser.version(), mode: update ? 'record' : 'compare', fixtures: results }, null, 2));
  } catch (error) {
    if (activePage && !activePage.isClosed()) {
      await activePage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(output, 'failure.html'), await activePage.content().catch(() => ''));
    }
    fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({
      fixture: currentFixture, browser: browser?.version(), url: activePage?.url(),
      message: error.message, browserErrors,
    }, null, 2) + '\n');
    console.error(`Visual regression failed for ${currentFixture || 'browser startup'}; diagnostics: ${output}`);
    throw error;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
