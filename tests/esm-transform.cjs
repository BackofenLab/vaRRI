// Jest executes the native browser modules as CommonJS only inside its VM.
// The application itself is loaded untransformed in browser regression checks.
const { transformSync } = require('esbuild');

module.exports = {
  process(source, filename) {
    return transformSync(source, {
      format: 'cjs', loader: 'js', sourcefile: filename,
      sourcemap: 'inline', target: 'node24',
    });
  },
};
