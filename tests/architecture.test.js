const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkArchitecture } = require('../scripts/check-architecture.cjs');

let root;
function write(file, contents) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}
function failures() { return checkArchitecture(root).errors.join('\n'); }

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'varri-architecture-'));
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

test('accepts native source, standard URL data APIs, and ancillary classic document pages', () => {
  write('README.html', '<script>document.title = "README";</script>');
  write('src/core/model/prose.js', '// window.document is a forbidden dependency, not an actual one here.\nexport const description = "document";');
  expect(failures()).toBe('');
});

test.each(['src/ui/large.js', 'src/ui/styles/large.css', 'citation.html', 'fornac/custom.js', 'src/core/dist/hidden.js', 'src/ui/output/hidden.js'])(
  'rejects an oversized authored file: %s', file => {
    write(file, '// line\n'.repeat(401));
    expect(failures()).toContain(`${file}: Authored files must have at most 400 lines; found 401.`);
  }
);

test('excludes only the root generated distribution and browser diagnostic directories', () => {
  write('dist/varri.js', '// generated\n'.repeat(401));
  write('output/playwright/failure.html', '<!-- generated -->\n'.repeat(401));
  expect(failures()).toBe('');
});

test.each(['ts', 'tsx', 'jsx', 'vue'])('rejects unsupported authored .%s source', extension => {
  write(`src/ui/component.${extension}`, '');
  expect(failures()).toContain('not TypeScript, JSX, or Vue SFCs');
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

test('only exact vendor assets with license and provenance are exempt', () => {
  write('src/ui/vendor/marked.js', '// upstream\n'.repeat(401));
  write('src/ui/vendor/MARKED-LICENSE.txt', 'License');
  write('src/ui/vendor/README.md', 'Provenance');
  expect(failures()).toBe('');
  write('src/ui/vendor/custom.js', '// authored\n'.repeat(401));
  expect(failures()).toContain('custom.js: Authored files must have at most 400 lines');
  fs.unlinkSync(path.join(root, 'src/ui/vendor/MARKED-LICENSE.txt'));
  expect(failures()).toContain('Pinned vendor asset is missing license/provenance');
});
