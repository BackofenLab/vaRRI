import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { checkArchitecture } from '../scripts/check-architecture.js';

let root, vendorAssets;
function write(file, contents) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}
function failures() { return checkArchitecture(root, { vendorAssets }).errors.join('\n'); }
function record(file) {
  return { path: file, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') };
}
function pin(file, contents = '/* pinned distribution */') {
  write(file, contents);
  write('vendor/LICENSE.txt', 'Original license');
  write('vendor/README.md', 'Pinned upstream URL, version and adaptation provenance');
  vendorAssets.push({ ...record(file), licenses: [record('vendor/LICENSE.txt')], provenance: record('vendor/README.md') });
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'varri-architecture-'));
  vendorAssets = [];
  write('package.json', '{"type":"module"}');
  write('src/package.json', '{"type":"module"}');
  write('index.html', `<script type="importmap">{"imports":{"varri":"./src/core/index.js","vue":"./src/ui/framework.js"}}</script>
<script type="module" src="src/main.js"></script>`);
  write('src/main.js', "import './ui/app.js';");
  write('src/ui/app.js', "import { value } from 'varri'; export { value };");
  write('src/ui/framework.js', 'export const reactive = value => value;');
  write('src/core/index.js', "export * from './model/index.js';");
  write('src/core/model/index.js', 'export const value = new URLSearchParams();');
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test('accepts native source, standard URL data APIs, and native ancillary document pages', () => {
  write('src/ui/pages/readme.js', 'document.title = "README";');
  write('README.html', '<script type="module" src="src/ui/pages/readme.js"></script>');
  write('src/core/model/prose.js', '// window.document is a forbidden dependency, not an actual one here.\nexport const description = "document";');
  expect(failures()).toBe('');
});

test.each(['src/ui/large.js', 'src/ui/styles/large.css', 'citation.html', 'fornac/custom.js', 'src/core/dist/hidden.js',
  'src/ui/output/hidden.js', 'README.md', 'docs/guide.md', 'settings.json', '.github/workflows/test.yml'])(
  'rejects an oversized authored file: %s', file => {
    write(file, '// line\n'.repeat(401));
    expect(failures()).toContain(`${file}: Text files must have at most 400 lines; found 401.`);
  }
);

test('identifies generated output and npm lock data explicitly', () => {
  write('dist/varri.js', '// generated\n'.repeat(401));
  write('output/playwright/failure.html', '<!-- generated -->\n'.repeat(401));
  write('package-lock.json', '\n'.repeat(401));
  expect(failures()).toBe('');
});

test.each(['src/ui/hidden.js', 'README.md', 'settings.json'])(
  'known source/text files cannot evade checks by containing NUL: %s', file => {
    write(file, '\0' + '// hidden code\n'.repeat(401));
    expect(failures()).toContain(`${file}: Source and text files must not contain NUL bytes`);
  }
);

test.each(['ts', 'tsx', 'jsx', 'vue', 'cjs', 'mjs', 'py', 'sh'])('rejects unsupported authored .%s source', extension => {
  write(`scripts/component.${extension}`, '');
  expect(failures()).toContain('Authored code must use native .js ES modules');
});

test.each([
  ["import './missing.js';", 'does not resolve'],
  ["import './framework';", 'explicit .js extension'],
  ["import 'unmapped';", 'not in the import map'],
  ["import 'https://example.test/remote.js';", 'not in the import map'],
  ["import('./' + name);", 'literal, checkable module path'],
  ["require('./framework.js');", 'CommonJS or custom code loaders'],
  ['module.exports = {};', 'CommonJS exports'],
  ['exports.value = 1;', 'CommonJS exports'],
  ['eval("1");', 'custom code loaders'],
  ['new Function("return 1");', 'custom code loaders'],
])('rejects a browser import/loader violation: %s', (source, message) => {
  write('src/ui/app.js', source);
  expect(failures()).toContain(message);
});

test.each([
  ["import '../ui/app.js';", 'Core must depend only on core'],
  ["export * from 'vue';", 'Core must depend only on core'],
  ["import('../../fornac/fornac.js');", 'legacy raw Fornac'],
  ['new fornac.FornaContainer();', 'global raw Fornac'],
])('rejects a reverse core dependency: %s', (source, message) => {
  write('fornac/fornac.js', '');
  write('fornac/fornac.LICENSE.txt', 'License');
  write('fornac/README.md', 'Provenance');
  write('src/core/index.js', source);
  expect(failures()).toContain(message);
});

test.each([
  'document.querySelector("svg");',
  'globalThis["window"];',
  'new DOMParser();',
  'fetch("sequence.json");',
])('rejects browser state in the pure model: %s', source => {
  write('src/core/model/index.js', source);
  expect(failures()).toContain('Pure model must not access DOM/browser state');
});

test('rejects model imports of canvas code even when the target has no DOM reference', () => {
  write('src/core/canvas/helper.js', 'export const value = 1;');
  write('src/core/model/index.js', "export * from '../canvas/helper.js';");
  expect(failures()).toContain('Model dependencies must remain inside the pure model');
});

test('rejects native CSS module imports and missing stylesheet imports', () => {
  write('src/ui/theme.css', '@import "./missing.css";');
  write('src/ui/app.js', "import './theme.css';");
  expect(failures()).toContain('explicit .js extension');
  expect(failures()).toContain('Import does not resolve');
});

test('source and HTML entries cannot depend on generated distribution files', () => {
  write('dist/varri.min.js', '/* generated */');
  write('src/ui/app.js', "import '../../dist/varri.min.js';");
  write('index.html', '<script type="module" src="dist/varri.min.js"></script>');
  expect(failures()).toContain('Source must not depend on generated dist files');
  expect(failures()).toContain('native src/main.js module entry is missing');
});

test('the application entry requires a module declaration and an import map', () => {
  write('index.html', '<script src="src/main.js"></script>');
  write('src/package.json', '{"type":"commonjs"}');
  expect(failures()).toContain('Application scripts must be an import map or an external native module');
  expect(failures()).toContain('Exactly one native import map');
  expect(failures()).toContain('Native source requires type: module');
});

test('pinned distributions skip authored syntax checks but obey the same line limit', () => {
  pin('vendor/runtime.js', 'module.exports = {};');
  expect(failures()).toBe('');
  pin('vendor/oversized.js', '// upstream\n'.repeat(401));
  expect(failures()).toContain('oversized.js: Text files must have at most 400 lines');
});

test.each(['asset', 'license', 'provenance'])('rejects a changed pinned %s even at the approved path', kind => {
  pin('vendor/runtime.js');
  const file = kind === 'asset' ? 'vendor/runtime.js' : kind === 'license' ? 'vendor/LICENSE.txt' : 'vendor/README.md';
  write(file, 'Changed bytes');
  expect(failures()).toContain(`Pinned vendor ${kind} checksum changed: ${file}`);
});

test.each(['asset', 'license', 'provenance'])('requires every pinned %s record to exist', kind => {
  pin('vendor/runtime.js');
  const file = kind === 'asset' ? 'vendor/runtime.js' : kind === 'license' ? 'vendor/LICENSE.txt' : 'vendor/README.md';
  fs.unlinkSync(path.join(root, file));
  expect(failures()).toContain(`Pinned vendor ${kind} is missing: ${file}`);
});

test('new files in vendor directories remain authored code', () => {
  pin('vendor/runtime.js');
  write('vendor/custom.js', 'module.exports = {};');
  expect(failures()).toContain('vendor/custom.js:1: Native source must not use CommonJS exports');
});

test.each(['scripts/helper.js', 'tests/helper.js'])('requires genuine ESM in authored Node tooling: %s', file => {
  write(file, 'const fs = require("node:fs"); module.exports = fs;');
  expect(failures()).toContain('CommonJS or custom code loaders');
  expect(failures()).toContain('CommonJS exports');
  write(file, 'import fs from "node:fs"; export default fs;');
  expect(failures()).toBe('');
});

test('the repository root must declare native ESM for authored Node helpers', () => {
  write('package.json', '{"type":"commonjs"}');
  expect(failures()).toContain('package.json: Native source requires type: module');
});

test('Jest cannot conceal a CommonJS source transformation behind an ESM helper', () => {
  write('package.json', JSON.stringify({ type: 'module', jest: { transform: { '^.+\\.js$': './transform.js' } } }));
  expect(failures()).toContain('Tests must execute native ES modules without source transforms');
});

test.each([
  '<script>document.title = "README";</script>',
  '<script src="https://example.test/runtime.js"></script>',
])('ancillary HTML cannot retain classic or inline authored scripts: %s', html => {
  write('README.html', html);
  expect(failures()).toContain('README.html: Application scripts must be an import map or an external native module');
});

test.each(['<button onclick="copy()">Copy</button>', '<a href="javascript:copy()">Copy</a>'])(
  'ancillary controls must use module event listeners: %s', html => {
    write('citation.html', html);
    expect(failures()).toContain('citation.html: Use native module event listeners');
  }
);

test('an authored helper cannot hide CommonJS inside a local package scope', () => {
  write('fornac/package.json', '{"type":"commonjs"}');
  write('fornac/helper.js', 'exports.value = 1;');
  expect(failures()).toContain('fornac/helper.js:1: Native source must not use CommonJS exports');
});
