// Exercise the tarball, not the source checkout: missing files must fail CI.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'varri-package-check-'));
const npm = (args, cwd) => execFileSync('npm', args, {
  cwd, encoding: 'utf8', env: { ...process.env, npm_config_cache: path.join(temp, 'cache') },
});

try {
  npm(['pack', '--pack-destination', temp], root);
  const archive = fs.readdirSync(temp).find(name => name.endsWith('.tgz'));
  assert.ok(archive, 'npm pack produced an archive');
  const consumer = path.join(temp, 'consumer');
  fs.mkdirSync(consumer);
  fs.writeFileSync(path.join(consumer, 'package.json'), '{"private":true}');
  npm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', path.join(temp, archive)], consumer);
  const installedRequire = createRequire(path.join(consumer, 'package.json'));
  const installed = path.dirname(installedRequire.resolve('varri-js/package.json'));
  const manifest = installedRequire('varri-js/package.json');
  assert.equal(manifest.name, 'varri-js');
  assert.equal(manifest.repository.url, 'git+https://github.com/BackofenLab/vaRRI.git');
  assert.equal(archive, `varri-js-${manifest.version}.tgz`);
  for (const key of Object.keys(manifest.exports)) {
    const specifier = key === '.' ? manifest.name : manifest.name + key.slice(1);
    assert.ok(fs.statSync(installedRequire.resolve(specifier)).isFile(), specifier);
  }
  const exportTargets = value => typeof value === 'string' ? [value]
    : Object.values(value).flatMap(exportTargets);
  for (const target of exportTargets(manifest.exports)) {
    assert.ok(fs.statSync(path.join(installed, target)).isFile(), `Missing conditional export: ${target}`);
  }
  assert.equal(typeof installedRequire('varri-js').render, 'function');
  // Legacy D3 remains a classic/UMD asset even though authored package files are ESM.
  const legacyDom = new JSDOM('<!doctype html><html><body></body></html>');
  const previousGlobals = new Map(['document', 'window', 'd3'].map(name =>
    [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  try {
    globalThis.document = legacyDom.window.document;
    globalThis.window = legacyDom.window;
    const legacyD3 = installedRequire('varri-js/fornac/d3.js');
    assert.equal(legacyD3.version, '3.4.13');
    assert.equal(legacyD3.scale.linear().domain([0, 10]).range([0, 100])(5), 50);
    assert.equal(globalThis.d3, legacyD3, 'Legacy D3 still publishes its browser global.');
  } finally {
    legacyDom.window.close();
    for (const [name, descriptor] of previousGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
  execFileSync(process.execPath, ['--input-type=module', '-e',
    "import v, { createVaRRI } from 'varri-js'; if (typeof v.render !== 'function' || typeof createVaRRI !== 'function') throw Error('ESM API missing'); const a = createVaRRI(); const b = createVaRRI(); a.setColors({ sequence1: 'red' }); if (b.getColors().sequence1 === 'red') throw Error('Instances share colors')"], { cwd: consumer });

  const origin = 'https://installed-package.invalid/';
  for (const name of ['index.html', 'README.html', 'citation.html']) {
    const html = fs.readFileSync(path.join(installed, name), 'utf8');
    const dom = new JSDOM(html);
    for (const element of dom.window.document.querySelectorAll('[src], link[href], a[href]')) {
      const value = element.getAttribute('src') || element.getAttribute('href');
      const url = new URL(value, origin + name);
      if (url.origin !== new URL(origin).origin) continue;
      const target = path.join(installed, decodeURIComponent(url.pathname));
      assert.ok(fs.existsSync(target), `${name} references missing packaged file ${value}`);
    }
    for (const element of dom.window.document.querySelectorAll('script[type="importmap"]')) {
      for (const value of Object.values(JSON.parse(element.textContent).imports || {})) {
        const url = new URL(value, origin + name);
        if (url.origin === new URL(origin).origin) {
          assert.ok(fs.existsSync(path.join(installed, decodeURIComponent(url.pathname))), `${name} import map references missing ${value}`);
        }
      }
    }
    dom.window.close();
  }
  const helpDocuments = ['README.md', 'docs/viewer-guide.md', 'docs/sharing-and-input.md'];
  for (const name of [...helpDocuments, 'CITATION.bib', 'CITATION.cff', 'src/README.md']) {
    assert.ok(fs.statSync(path.join(installed, name)).size > 0, `${name} must be packaged`);
  }
  for (const name of ['README.md', 'fornac.css', 'fornac.css.map',
    'licenses/vaRRI-MIT.txt', 'licenses/D3-ISC.txt',
    'licenses/Fornac-Apache-2.0.txt', 'licenses/Fornac-NOTICE.md']) {
    assert.ok(fs.statSync(path.join(installed, 'dist', name)).size > 0, `Missing embedding asset: ${name}`);
  }
  // Markdown embeds are loaded by README.html after parsing, so inspect them too.
  for (const name of helpDocuments) {
    const markdown = fs.readFileSync(path.join(installed, name), 'utf8');
    for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      const url = new URL(match[1], new URL(name, origin));
      if (url.origin === new URL(origin).origin) {
        assert.ok(fs.existsSync(path.join(installed, decodeURIComponent(url.pathname))), `Missing ${name} image ${match[1]}`);
      }
    }
  }
  console.log('Installed package: viewer assets, documentation, citation data, CommonJS, ESM and legacy D3 passed.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
