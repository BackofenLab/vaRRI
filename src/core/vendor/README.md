# Pinned D3 runtime

`d3-runtime.js` contains the repository's D3 **3.4.13** engine. The exact
[historical BSD 3-Clause license](D3-LICENSE.txt) is preserved from
[D3 commit 9364923](https://github.com/d3/d3/blob/9364923ee2b35ec2eb80ffc4bdac12a7930097fc/LICENSE).
The readable engine source is available in the
[pinned upstream release](https://github.com/d3/d3/blob/9364923ee2b35ec2eb80ffc4bdac12a7930097fc/d3.js)
and the
[original repository copy](https://github.com/BackofenLab/vaRRI/blob/a9a10b6ab51e061bbb19a7090d6342a63b6f86bf/fornac/d3.js)
(SHA-256 `246abb6cc7bbd79ccca9a1487519368ce851f6e3e64fa44b7e5077719125d4d8`).
The retained `fornac/d3.js` compatibility URL now serves the exact upstream
production distribution; it is separate from this adapted native runtime.

This engine is adapted, not an unmodified upstream distribution: initialization
takes a Document argument, obtains its window through `defaultView`, and returns
D3 without publishing browser globals. Its previously checked-in minified bytes
are available in the
[adapted runtime snapshot](https://github.com/BackofenLab/vaRRI/blob/a9a10b6ab51e061bbb19a7090d6342a63b6f86bf/src/core/vendor/d3.js),
SHA-256 `83ba9bdf9222406fbcbeedacc8315c616123427482e83cb1fafb8e4e1c3295ae`.

The current asset extracts that snapshot's `function Js(qn)` engine verbatim,
ending immediately before `const ti=new WeakMap;function Ks(qn)`, and appends
`export { Js as default };`. Only the attribution header and export declaration
were added; the engine's algorithms and minified function body are unchanged.
These exact boundaries make the extraction reproducible without re-minifying
the engine. `scripts/vendor-manifest.js` pins the resulting asset, license, and
this provenance document.

`d3.js` is the separate, readable vaRRI-owned `getD3(document)` adapter. Its
WeakMap reuses the engine for the same Document and isolates different Documents.
Importing this adapter or the core is safe without a DOM and does not initialize
D3. It is checked as authored native JavaScript, without a vendor syntax bypass.

The checked-in runtime is imported directly by the browser; serving or developing
the viewer never generates or compiles it. All vendor code files meet the
400-line limit; owned modules stay readable and are never minified to evade it.
