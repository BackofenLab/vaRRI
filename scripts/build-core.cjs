// Distribution only: the source viewer imports the native ES modules directly.
const { build } = require('esbuild');
const fs = require('node:fs');

function verifyCoreOnly(result) {
  const unexpected = Object.keys(result.metafile.inputs).filter(file => !file.startsWith('src/core/'));
  if (unexpected.length) throw new Error(`Core bundle imported non-core modules: ${unexpected.join(', ')}`);
}

async function main() {
  const common = { entryPoints: ['src/core/index.js'], bundle: true, sourcemap: true,
    target: 'es2022', legalComments: 'linked', metafile: true,
    banner: { js: '/*! vaRRI: MIT; extracted Fornac algorithms: Apache-2.0. See licenses/ in this distribution.\n' +
      fs.readFileSync('src/core/vendor/D3-LICENSE.txt', 'utf8') + '\n*/' } };
  verifyCoreOnly(await build({ ...common, outfile: 'dist/varri.min.js', format: 'iife',
    globalName: 'vaRRI', minify: true, footer: { js: 'vaRRI = vaRRI.default;' } }));
  verifyCoreOnly(await build({ ...common, outfile: 'dist/varri.cjs', format: 'cjs', platform: 'node',
    footer: { js: 'module.exports = module.exports.default;' } }));
  // Preserve the published mixed-case URLs while adding the issue's lowercase entry.
  fs.copyFileSync('dist/varri.min.js', 'dist/vaRRI.min.js');
  fs.copyFileSync('dist/varri.min.js.map', 'dist/vaRRI.min.js.map');
  fs.mkdirSync('dist/licenses', { recursive: true });
  for (const [source, target] of [
    ['LICENSE', 'licenses/vaRRI-MIT.txt'],
    ['src/core/vendor/D3-LICENSE.txt', 'licenses/D3-BSD.txt'],
    ['src/core/canvas/graph/LICENSE.txt', 'licenses/Fornac-Apache-2.0.txt'],
    ['src/core/canvas/graph/NOTICE.md', 'licenses/Fornac-NOTICE.md'],
    ['fornac/fornac.css', 'fornac.css'], ['fornac/fornac.css.map', 'fornac.css.map'],
    ['docs/standalone-embedding.md', 'README.md'],
  ]) fs.copyFileSync(source, `dist/${target}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
