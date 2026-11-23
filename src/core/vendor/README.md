# Pinned D3 runtime

The native core uses **D3 7.9.0**, the current published release verified on
30 September 2026. It is vendored locally: source development and deployment
require no npm runtime, compilation, CDN, or browser globals.

Upstream: [release v7.9.0](https://github.com/d3/d3/releases/tag/v7.9.0),
[npm tarball](https://registry.npmjs.org/d3/-/d3-7.9.0.tgz).
`D3-LICENSE.txt` is the exact ISC license from that package.

`d3-runtime.js` contains the exact minified factory body from
`package/dist/d3.min.js`. The upstream UMD loader is replaced by an ESM default
export. Four explicit parameters (`document`, `window`, `navigator`, and
`SVGElement`) are added after its existing export-object parameter `t` so browser
state is scoped to the caller's Document. No algorithm is changed or re-minified.
The attribution header is preserved. The readable `d3.js` adapter creates the
export object and passes the document's browser objects; its WeakMap isolates
Documents and avoids all browser access during a headless import.

Reproduce the extraction from `npm pack d3@7.9.0 --ignore-scripts`:

1. In `dist/d3.min.js`, take the substring after the opening parenthesis of
   `(function(t){` through the closing brace immediately before the final `));`.
2. Replace only `function(t){` with
   `function(t,document,window,navigator,SVGElement){`.
3. Prepend the original attribution line, the integration comment in the
   committed file, and `export default `; append `;` and a newline.
4. Copy `LICENSE` verbatim. Verify all recorded SHA-256 values in
   `scripts/vendor-manifest.js`.
