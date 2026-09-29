// Real-browser contract checks for native ESM and the standalone core bundle.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/playwright/core-contract');
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json' };
const html = mode => `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="/fornac/fornac.css">
<style>.canvas { width: 640px; height: 480px; } svg { width:100%; height:100%; }</style>
<div id="first" class="canvas"></div><div id="second" class="canvas"></div>
${mode === 'native' ? '<script type="module">import api from "/src/core/index.js"; window.testApi = api;</script>'
  : '<script src="/dist/varri.min.js"></script><script>window.testApi = vaRRI;</script>'}`;

function serve() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/__core_test') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(html(url.searchParams.get('mode')));
      return;
    }
    if (url.pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
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

async function exercise() {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const api = window.testApi;
  check(!window.fornac && !window.Vue && !window.d3, 'Core must not require vendor globals');
  const first = api.createVaRRI();
  const second = api.createVaRRI();
  first.setColors({ sequence1: '#123456' });
  const state = { sequence: 'AAAAA&UUUUU', structure: '((..(&)..))',
    startIndex1: '-2', startIndex2: '10', highlighting: 'nothing', backgroundhighlighting: 'nothing' };
  const a = first.validate(state), b = second.validate(state);
  await Promise.all([first.render('first', a), second.render('second', b)]);
  const snapshot = id => {
    const element = document.getElementById(id);
    const nucleotides = [...element.querySelectorAll('circle[node_type="nucleotide"]')];
    const nodes = nucleotides.map(circle => circle.__data__);
    const links = [...element.querySelectorAll('line')].map(line => line.__data__);
    check(nodes.length === 10, id + ': every real nucleotide must remain visible');
    check(nodes.map(node => node.num).join(',') === '1,2,3,4,5,6,7,8,9,10', id + ': contiguous IDs');
    check(nodes.every(node => [node.x, node.y, node.px, node.py].every(Number.isFinite)), id + ': finite coordinates');
    const backbone = links.filter(link => link.linkType === 'backbone');
    check(backbone.length === 8 && !backbone.some(link => link.source.num === 5 && link.target.num === 6), id + ': no strand-crossing backbone');
    const pairs = links.filter(link => ['basepair', 'pseudoknot'].includes(link.linkType));
    check(pairs.length === 3 && new Set(pairs.map(link => link.uid)).size === 3, id + ': unique base pairs');
    return nodes.map((node, index) => ({ num: node.num, name: node.name, x: node.x, y: node.y,
      color: getComputedStyle(nucleotides[index]).fill }));
  };
  const firstScene = snapshot('first'), secondScene = snapshot('second');
  check(firstScene[0].color === 'rgb(18, 52, 86)', 'First instance custom color');
  check(secondScene[0].color === 'rgb(173, 216, 230)', 'Second instance independent color');
  const svg = second.buildSVGString('second');
  check(svg.includes('<svg') && svg.includes('fill:') && !svg.includes('NaN'), 'Self-contained SVG export');
  const pendingFirst = first.render('first', a, { forceLayout: true, forceLayoutLinearRRI: true });
  const pendingSecond = second.render('second', b, { forceLayout: true, forceLayoutLinearRRI: true });
  first.cancelActiveRender();
  const cancelled = await pendingFirst;
  const completed = await pendingSecond;
  check(cancelled.cancelled === true && completed.cancelled === false, 'Cancellation must be instance-local');
  snapshot('second');
  second.cancelActiveRender();
  // Repeated disposal is safe, and a new render can follow disposal.
  second.cancelActiveRender();
  await second.render('second', b);
  snapshot('second');
  check(document.querySelectorAll('#second svg').length === 1, 'Rerender must replace old canvas');
  window.exportApi = second;
  return { firstScene, secondScene };
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const server = await serve();
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.VARRI_BROWSER_PATH ? { executablePath: process.env.VARRI_BROWSER_PATH } : {}) });
    const scenes = {};
    for (const mode of ['native', 'bundle']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(request.url()));
      page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
      await page.addInitScript(() => {
        let seed = 83;
        Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/__core_test?mode=${mode}`);
      await page.waitForFunction(() => window.testApi?.createVaRRI);
      scenes[mode] = await page.evaluate(exercise);
      for (const extension of ['svg', 'png']) {
        const download = page.waitForEvent('download');
        await page.evaluate(extension => {
          window.exportApi[extension === 'svg' ? 'downloadSVG' : 'downloadPNG']('second');
        }, extension);
        const target = path.join(output, `${mode}.${extension}`);
        await (await download).saveAs(target);
        const bytes = fs.readFileSync(target);
        assert.ok(bytes.length > 100, mode + ': nonempty ' + extension + ' download');
        if (extension === 'png') assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        else assert.ok(bytes.toString().includes('<svg'));
      }
      assert.deepEqual(errors, [], mode + ': browser errors');
      assert.ok(!requests.some(url => /vue|fornac\.js/.test(url)), mode + ': UI-free core dependency graph');
      await page.evaluate(() => window.exportApi.cancelActiveRender());
      await page.close();
    }
    assert.deepEqual(scenes.native, scenes.bundle, 'Native source and standalone bundle render the same scene');
    console.log('Browser contracts passed: native/bundle parity, topology, instance isolation, force cancellation, SVG and PNG export.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
