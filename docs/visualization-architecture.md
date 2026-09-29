# Native-module architecture

The source viewer runs from any static HTTP server. The browser resolves
`src/main.js` and the import map in `index.html`; no Node runtime, bundler, or
transpiler is needed to develop or serve it. Native modules require HTTP rather
than opening the viewer through `file://`.

## Dependency direction

```text
src/main.js -> src/ui/ -> src/core/index.js
                             |
                             +-> model/       plain data and algorithms
                             +-> canvas/      SVG, D3, export, lifecycle
                                   |
                                   +-> model/
                                   +-> vendor/d3.js
```

`src/core/model/` has no DOM, Vue, or canvas dependency. It handles validation,
sequence indexing and cropping, bracket pairs, annotations, helix groups, and
URL state. Its values can be serialized without graph cycles or DOM objects.
The UI translates form state into model inputs and passes validated data to the
canvas. The canvas may import model functions; the model never imports the UI.

## Core instances and API

`createVaRRI()` produces an independent API instance. Pure helpers are shared
functions; stateful operations receive an explicit session containing colors,
annotation registries, a scoped DOM adapter, and lifecycle state. The document
and its D3 runtime are resolved only when drawing. Importing the core and using
validation in Node does not require a DOM.

The default export and named compatibility methods use a default instance for
existing consumers. Create a separate instance for each independent embedded
viewer. Call its `cancelActiveRender()` before discarding it. The default API
also exposes `createVaRRI` for CommonJS and classic-script consumers.

`src/vaRRI.js` is a small native reexport. Package ESM imports resolve to source;
CommonJS uses the generated `dist/varri.cjs`. The standalone
`dist/varri.min.js` includes the core and D3 and installs `window.vaRRI`.
The older mixed-case bundle URL remains available. No standalone core entry
depends on Vue or the raw Fornac runtime.

## UI boundary

Vue components use JavaScript objects and template strings from the full native
browser ESM distribution; no `.vue` single-file component requires compilation.
Reactive state contains input values and serializable annotation data only.
Renderer services hold their core instance in an ordinary closure, outside
Vue's reactive graph.

`createViewerApp()` mounts the component tree and connects focused controllers
for sequence validation, FASTA, profiles, annotations, dialogs, sharing, and
rendering. Inputs, errors, lists, and dialogs read the same plain Vue state.
The canvas is an imperative child owned by the core; Vue does not render its SVG.
Unmounting cancels rendering and removes observers, timers, and UI listeners.

Vue's full browser ESM runtime and the example-caption Markdown parser are pinned
local assets, so the viewer needs no CDN connection. Existing URL names and
encodings pass through the pure model codec. Rendering-only links and full-page
links use the same component tree and state.

## Source, distribution, and verification

Owned source modules have one coherent responsibility and at most 400 lines.
Vendor runtime assets retain their original license and provenance. D3 remains
at the repository's pinned version to isolate architectural changes from force
engine changes.

`npm run build` is for distribution and embedding. GitHub Pages serves the same
native modules used in development. Unit tests may transform ESM for Jest's
test harness; the real-browser checks independently exercise native imports.

The regression suite includes original visual fixtures, semantic model and force
tests, separate viewer instances, URL behavior, SVG/PNG export, and the actual
packed/installed npm distribution. Tests should assert observable behavior,
not reproduce the implementation or silently accept visual changes.

`npm run test:architecture` checks native imports, module boundaries, and authored
file sizes. The build also inspects its input graph to reject non-core dependencies.
PR CI runs these checks, unit and installed-package tests, and the three real-browser
suites. The standalone bundle workflow runs on push/release; Pages serves source.
See [standalone-embedding.md](standalone-embedding.md) and the contributor rules in
[AGENTS.md](../AGENTS.md).
