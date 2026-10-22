import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { parse } from '@babel/parser';
import { VENDOR_ASSETS } from './vendor-manifest.js';

const SKIP_DIRECTORIES = new Set(['.git', 'node_modules']);
const GENERATED_DIRECTORIES = new Set(['dist', 'output']);
// npm owns its lockfile format; this is an explicit generated-data boundary.
const GENERATED_FILES = new Set(['package-lock.json']);
const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.pdf']);
const TEXT_EXTENSIONS = new Set(['.js', '.html', '.css', '.json', '.md', '.txt', '.yml', '.yaml', '.cff', '.bib', '.map', '.svg']);
const FORBIDDEN_EXTENSIONS = new Set(['.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.vue',
  '.py', '.pyw', '.sh', '.bash', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.cs', '.php']);
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
export function checkArchitecture(root = fileURLToPath(new URL('..', import.meta.url)), { vendorAssets = VENDOR_ASSETS } = {}) {
  root = path.resolve(root);
  const files = listFiles(root);
  const errors = [];
  const fail = (file, message, node) => errors.push(`${file}${node?.loc ? `:${node.loc.start.line}` : ''}: ${message}`);
  const exists = file => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile();
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  let filesChecked = 0, nativeModules = 0;
  const imports = {};
  const vendors = new Map(vendorAssets.map(asset => [asset.path, asset]));

  function verifyRecord(record, owner, label) {
    const target = record?.path;
    if (!target || path.isAbsolute(target) || target.split('/').includes('..') || !exists(target)) {
      fail(owner, `Pinned vendor ${label} is missing: ${target || '(unspecified)'}`);
      return;
    }
    const digest = createHash('sha256').update(fs.readFileSync(path.join(root, target))).digest('hex');
    if (digest !== record.sha256) fail(owner, `Pinned vendor ${label} checksum changed: ${target}`);
  }
  for (const asset of vendorAssets) {
    verifyRecord(asset, asset.path, 'asset');
    if (!asset.licenses?.length) fail(asset.path, 'Pinned vendor requires a license record.');
    for (const license of asset.licenses || []) verifyRecord(license, asset.path, 'license');
    verifyRecord(asset.provenance, asset.path, 'provenance');
  }

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
    if (realTarget.startsWith('dist/') || realTarget.startsWith('node_modules/')) {
      fail(file, `Source must not depend on generated dist files or node_modules: ${specifier}`);
    }
    return realTarget;
  }

  for (const file of ['package.json', 'src/package.json']) {
    if (!exists(file)) fail(file, 'Native source requires type: module.');
    else {
      try {
        const config = JSON.parse(read(file));
        if (config.type !== 'module') fail(file, 'Native source requires type: module.');
        if (file === 'package.json' && Object.keys(config.jest?.transform || {}).length) {
          fail(file, 'Tests must execute native ES modules without source transforms.');
        }
      }
      catch { fail(file, 'Invalid JSON.'); }
    }
  }
  if (!exists('index.html')) fail('index.html', 'The native application entry is missing.');
  for (const file of files.filter(file => file.endsWith('.html'))) {
    let mainFound = false, importMapCount = 0;
    const html = read(file).replace(/<!--[\s\S]*?-->/g, '');
    if (/<[a-z][^>]*\s+on[\w-]+\s*=/i.test(html) || /\b(?:href|src)\s*=\s*["']\s*javascript:/i.test(html)) {
      fail(file, 'Use native module event listeners, not inline JavaScript handlers.');
    }
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const attrs = attributes(match[1]);
      if (attrs.type === 'importmap') {
        importMapCount++;
        try {
          const map = JSON.parse(match[2]);
          for (const [name, target] of Object.entries(map.imports || {})) {
            const resolved = resolveLocal(file, target, '.js');
            if (resolved && file === 'index.html') imports[name] = resolved;
          }
        } catch { fail(file, 'Invalid import map JSON.'); }
      } else if (attrs.type === 'module' && attrs.src && !match[2].trim()) {
        const specifier = attrs.src.startsWith('.') ? attrs.src : './' + attrs.src;
        const entry = resolveLocal(file, specifier, '.js');
        if (entry === 'src/main.js') mainFound = true;
        else if (file === 'index.html') fail(file, 'The application must enter through src/main.js.');
      } else fail(file, 'Application scripts must be an import map or an external native module.');
    }
    if (file === 'index.html') {
      if (importMapCount !== 1) fail(file, 'Exactly one native import map is required.');
      if (!mainFound) fail(file, 'The native src/main.js module entry is missing.');
    }
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
    if (FORBIDDEN_EXTENSIONS.has(extension)) fail(file, 'Authored code must use native .js ES modules, not other source extensions.');
    if (GENERATED_FILES.has(file) || BINARY_EXTENSIONS.has(extension)) continue;
    const bytes = fs.readFileSync(path.join(root, file));
    if (bytes.includes(0)) {
      if (TEXT_EXTENSIONS.has(extension)) fail(file, 'Source and text files must not contain NUL bytes.');
      continue;
    }
    filesChecked++;
    const source = bytes.toString('utf8');
    const lines = source.split(/\r?\n/).length - (source.endsWith('\n') ? 1 : 0);
    if (lines > 400) fail(file, `Text files must have at most 400 lines; found ${lines}.`);
    // Pinned distributions still obey the file limit; only source syntax differs.
    if (vendors.has(file)) continue;
    const browserSource = file.startsWith('src/') || !file.includes('/');
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
        if (browserSource) checkDependency(file, node.source.value, node);
        else if (node.source.value.startsWith('.')) resolveLocal(file, node.source.value, '.js');
      }
      if (browserSource && (node.type === 'ImportExpression' || node.type === 'CallExpression' && node.callee.type === 'Import')) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = checkArchitecture();
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`Architecture passed: ${result.filesChecked} text files, ${result.nativeModules} native modules.`);
}
