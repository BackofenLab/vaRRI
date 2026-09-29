// Distribution only: the source viewer imports the native ES modules directly.
const { build } = require('esbuild');
const fs = require('node:fs');

async function main() {
  const common = { entryPoints: ['src/core/index.js'], bundle: true, sourcemap: true,
    target: 'es2022', legalComments: 'linked',
    banner: { js: '/*! vaRRI: MIT; extracted Fornac algorithms: Apache-2.0. See src/core/canvas/graph/LICENSE.txt and NOTICE.md.\n' +
      fs.readFileSync('src/core/vendor/D3-LICENSE.txt', 'utf8') + '\n*/' } };
  await build({ ...common, outfile: 'dist/varri.min.js', format: 'iife',
    globalName: 'vaRRI', minify: true, footer: { js: 'vaRRI = vaRRI.default;' } });
  await build({ ...common, outfile: 'dist/varri.cjs', format: 'cjs', platform: 'node',
    footer: { js: 'module.exports = module.exports.default;' } });
  // Preserve the published mixed-case URLs while adding the issue's lowercase entry.
  fs.copyFileSync('dist/varri.min.js', 'dist/vaRRI.min.js');
  fs.copyFileSync('dist/varri.min.js.map', 'dist/vaRRI.min.js.map');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
