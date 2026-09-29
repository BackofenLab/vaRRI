const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');

// Exact upstream assets only: new files placed in a vendor directory are authored.
const VENDORS = new Map([
  ['fornac/d3.js', ['fornac/d3.LICENSE.txt', 'fornac/README.md']],
  ['fornac/fornac.js', ['fornac/fornac.LICENSE.txt', 'fornac/README.md']],
  ['fornac/fornac.css', ['fornac/fornac.LICENSE.txt', 'fornac/README.md']],
  ['src/core/vendor/d3.js', ['src/core/vendor/D3-LICENSE.txt', 'src/core/vendor/README.md']],
  ['src/ui/vendor/vue.esm-browser.prod.js', ['src/ui/vendor/VUE-LICENSE.txt', 'src/ui/vendor/README.md']],
  ['src/ui/vendor/marked.js', ['src/ui/vendor/MARKED-LICENSE.txt', 'src/ui/vendor/README.md']],
]);
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules']);
const GENERATED_DIRECTORIES = new Set(['dist', 'output']);
const AUTHORED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.css', '.html']);
const FORBIDDEN_EXTENSIONS = new Set(['.ts', '.tsx', '.jsx', '.vue']);
const DOM_NAMES = new Set([
  'document', 'window', 'globalThis', 'self', 'navigator', 'location',
  'HTMLElement', 'SVGElement', 'Element', 'Node', 'DOMParser', 'XMLSerializer',
  'Image', 'MutationObserver', 'ResizeObserver', 'customElements',
  'localStorage', 'sessionStorage', 'XMLHttpRequest', 'fetch',
]);

function listFiles(root, directory = '') {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) return SKIP_DIRECTORIES.has(entry.name) || GENERATED_DIRECTORIES.has(relative) ? [] : listFiles(root, relative);
    return entry.isFile() ? [relative] : [];
  });
}

function walk(node, visit, parent = null, key = '') {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent, key);
  for (const [childKey, value] of Object.entries(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit, node, childKey));
    else if (value && typeof value === 'object') walk(value, visit, node, childKey);
  }
}

function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
    .map(match => [match[1].toLowerCase(), match[3]]));
}

function propertyName(node) {
  if (!node?.computed && node?.property?.type === 'Identifier') return node.property.name;
  return node?.property?.type === 'StringLiteral' ? node.property.value : null;
}

/** Check source architecture without compiling, executing, or modifying it. */
function checkArchitecture(root = path.resolve(__dirname, '..')) {
  root = path.resolve(root);
  const files = listFiles(root);
  const errors = [];
  const fail = (file, message, node) => errors.push(`${file}${node?.loc ? `:${node.loc.start.line}` : ''}: ${message}`);
  const exists = file => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile();
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  let filesChecked = 0, nativeModules = 0;
  const imports = {};

  function resolveLocal(file, specifier, extension) {
    if (typeof specifier !== 'string' || !specifier.startsWith('.')) {
      fail(file, `Expected a local ${extension} path: ${String(specifier)}`);
      return null;
    }
    if (!specifier.endsWith(extension)) {
      fail(file, `Native imports require an explicit ${extension} extension: ${specifier}`);
      return null;
    }
    const absolute = path.resolve(root, path.dirname(file), specifier);
    const target = path.relative(root, absolute).split(path.sep).join('/');
    if (target.startsWith('../') || path.isAbsolute(target) || !exists(target)) {
      fail(file, `Import does not resolve to a repository file: ${specifier}`);
      return null;
    }
    const realTarget = path.relative(root, fs.realpathSync(absolute)).split(path.sep).join('/');
    if (realTarget.startsWith('../') || path.isAbsolute(realTarget)) {
      fail(file, `Import resolves outside the repository: ${specifier}`);
      return null;
    }
    if (realTarget.startsWith('dist/')) fail(file, `Source must not depend on generated dist files: ${specifier}`);
    return realTarget;
  }

  if (!exists('src/package.json')) fail('src/package.json', 'Native source requires type: module.');
  else {
    try { if (JSON.parse(read('src/package.json')).type !== 'module') fail('src/package.json', 'Native source requires type: module.'); }
    catch { fail('src/package.json', 'Invalid JSON.'); }
  }
  if (!exists('index.html')) fail('index.html', 'The native application entry is missing.');
  else {
    let mainFound = false, importMapCount = 0;
    for (const match of read('index.html').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const attrs = attributes(match[1]);
      if (attrs.type === 'importmap') {
        importMapCount++;
        try {
          const map = JSON.parse(match[2]);
          for (const [name, target] of Object.entries(map.imports || {})) {
            const resolved = resolveLocal('index.html', target, '.js');
            if (resolved) imports[name] = resolved;
          }
        } catch { fail('index.html', 'Invalid import map JSON.'); }
      } else if (attrs.type === 'module' && attrs.src && !match[2].trim()) {
        const specifier = attrs.src.startsWith('.') ? attrs.src : './' + attrs.src;
        const entry = resolveLocal('index.html', specifier, '.js');
        if (entry === 'src/main.js') mainFound = true;
        else fail('index.html', 'The application must enter through src/main.js.');
      } else fail('index.html', 'Application scripts must be an import map or an external native module.');
    }
    if (importMapCount !== 1) fail('index.html', 'Exactly one native import map is required.');
    if (!mainFound) fail('index.html', 'The native src/main.js module entry is missing.');
  }

  function checkDependency(file, specifier, node) {
    const target = specifier.startsWith('.')
      ? resolveLocal(file, specifier, '.js') : imports[specifier];
    if (!target) {
      if (!specifier.startsWith('.')) fail(file, `Bare or remote import is not in the import map: ${specifier}`, node);
      return;
    }
    if (target === 'fornac/fornac.js' || target === 'fornac/d3.js') {
      fail(file, 'Native source must not load the legacy raw Fornac/D3 scripts.', node);
    }
    if (file.startsWith('src/core/') && !target.startsWith('src/core/')) {
      fail(file, `Core must depend only on core modules, not UI/frameworks: ${specifier}`, node);
    }
    if (file.startsWith('src/core/model/') && !target.startsWith('src/core/model/')) {
      fail(file, `Model dependencies must remain inside the pure model: ${specifier}`, node);
    }
  }

  for (const file of files) {
    const extension = path.extname(file);
    if (FORBIDDEN_EXTENSIONS.has(extension)) fail(file, 'Use native JavaScript modules, not TypeScript, JSX, or Vue SFCs.');
    if (VENDORS.has(file)) {
      for (const record of VENDORS.get(file)) if (!exists(record)) fail(file, `Pinned vendor asset is missing license/provenance: ${record}`);
      continue;
    }
    if (!AUTHORED_EXTENSIONS.has(extension)) continue;
    filesChecked++;
    const source = read(file);
    const lines = source.split(/\r?\n/).length - (source.endsWith('\n') ? 1 : 0);
    if (lines > 400) fail(file, `Authored files must have at most 400 lines; found ${lines}.`);
    const browserSource = file.startsWith('src/') || !file.includes('/');
    if (!browserSource) continue;
    if (file.startsWith('src/') && ['.mjs', '.cjs'].includes(extension)) fail(file, 'Browser source uses native .js modules.');
    if (extension === '.css') {
      const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)) resolveLocal(file, match[1], '.css');
      continue;
    }
    if (extension !== '.js') continue;
    nativeModules++;
    let ast;
    try { ast = parse(source, { sourceType: 'module', createImportExpressions: true }); }
    catch (error) { fail(file, `Invalid native JavaScript: ${error.message}`); continue; }
    walk(ast, (node, parent, key) => {
      if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source) {
        checkDependency(file, node.source.value, node);
      }
      if (node.type === 'ImportExpression' || node.type === 'CallExpression' && node.callee.type === 'Import') {
        const source = node.source || node.arguments[0];
        if (source?.type !== 'StringLiteral') fail(file, 'Dynamic imports must use a literal, checkable module path.', node);
        else checkDependency(file, source.value, node);
      }
      if (['CallExpression', 'NewExpression', 'OptionalCallExpression'].includes(node.type)) {
        const callee = node.callee;
        const name = callee?.type === 'Identifier' ? callee.name : propertyName(callee);
        if (['require', 'eval', 'Function'].includes(name)) fail(file, `Native source must not use CommonJS or custom code loaders (${name}).`, node);
      }
      if (['MemberExpression', 'OptionalMemberExpression'].includes(node.type)) {
        if (node.object?.name === 'exports' || node.object?.name === 'module' && propertyName(node) === 'exports') {
          fail(file, 'Native source must not use CommonJS exports.', node);
        }
        if (file.startsWith('src/core/') && propertyName(node) === 'fornac') fail(file, 'Core must not use the global raw Fornac runtime.', node);
      }
      if (node.type === 'Identifier' && node.name === 'fornac' && file.startsWith('src/core/')) {
        fail(file, 'Core must not use the global raw Fornac runtime.', node);
      }
      if (node.type === 'Identifier' && file.startsWith('src/core/model/') && DOM_NAMES.has(node.name)) {
        const propertyKey = key === 'key' && !parent.computed && !parent.shorthand;
        const memberKey = key === 'property' && !parent.computed;
        if (!propertyKey && !memberKey) fail(file, `Pure model must not access DOM/browser state (${node.name}).`, node);
      }
    });
  }
  return { filesChecked, nativeModules, errors };
}

module.exports = { checkArchitecture };

if (require.main === module) {
  const result = checkArchitecture();
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`Architecture passed: ${result.filesChecked} authored files, ${result.nativeModules} native modules.`);
}
