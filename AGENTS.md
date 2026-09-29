# Working on vaRRI

## Runtime and module boundaries

- Serve the checkout over HTTP and open `index.html`. Source development and
  GitHub Pages deployment require no build, transpiler, or Node runtime.
- Write browser code as modern JavaScript native ES modules in `.js` files. Use explicit `.js`
  extensions in local imports. Do not add TypeScript, JSX, Vue SFCs, bundler-only
  imports, or generated application source.
  Existing Node-only test/distribution helpers use `.cjs`. This is an implementation
  exception to issue #83's unqualified `.js`-only wording, not an approved waiver.
  Do not introduce additional exceptions; see `docs/strict-constraints-audit.md`.
- `src/core/model/` holds serializable data and algorithms. It must not reference
  DOM APIs, Vue, canvas, or a renderer session; its imports stay within model.
- `src/core/canvas/` owns SVG, D3 nodes, forces, interaction, exports, and disposal.
  It may use model helpers. The core must never depend on UI or raw `fornac.js`.
- `src/core/index.js` is the standalone API. `createVaRRI()` isolates viewer
  registries, colors, DOM scope, and render lifecycle. Keep headless imports safe.
- `src/ui/` uses the full native Vue browser ESM runtime through the import map.
  Components are JavaScript objects with template strings or `h()` functions.
  Keep D3 nodes, selections, forces, and renderer API instances outside Vue
  `reactive()`/`ref()` containers. Reactive state contains form values and plain
  annotation data only.
- Cancel active rendering and pending work when clearing or unmounting a viewer.
  Clean up observers, timers, event handlers, and stale asynchronous callbacks.

## Maintainable files and compatibility

- Keep authored code, HTML, and CSS files at or below 400 lines, with one coherent
  responsibility. Split by behavior, never by numbered chunks or compressed code.
  The current checker exempts pinned third-party runtimes and retained upstream
  Fornac sources. Issue #83 does not explicitly grant these exceptions. Keep their
  provenance and licenses, and do not interpret a passing checker as proof of
  literal repository-wide compliance.
- Preserve public API names and existing URL names/encodings, signed biological
  indices and skipped zero, annotation styles, profile coordinates, and exports.
  Generated region highlights must not become persistent user annotations.
- Use explicit strand boundaries and contiguous real-nucleotide IDs. Never restore
  dummy nucleotide padding or duplicate base-pair links to imitate Fornac input.
- Preserve D3 and layout algorithms during structural refactors. Treat engine or
  geometry changes as separate work requiring an explained visual review.
- Read `MIGRATION_PROTOCOL.md` and `docs/visualization-architecture.md` for the
  extraction map and `docs/force-field-graph.md` for graph constraints.

## Verification and distribution

Node is used for tests and distribution only. Install tools with `npm ci`.

- `npm run test:architecture`: file limits, native imports and module boundaries.
- `npm run test:ci`: model, lifecycle, UI, URL and package behavior.
- `npm run test:package`: packed and installed npm contents and entry points.
- `npx playwright install --with-deps chromium`: browser setup when needed.
- `npm run test:browser`: native/core-bundle parity, topology, instance isolation,
  force cancellation and SVG/PNG exports.
- `npm run test:ui`: real Vue forms, dialogs, examples, annotations and sharing.
- `npm run test:visual`: seeded geometry and pixel comparisons for five examples.

Run checks appropriate to the change, including required CI checks before a PR.
Add meaningful behavioral regressions for bugs; do not mirror implementation.
Never overwrite visual baselines just to make tests pass. Preserve the original
fixtures in `tests/visual-baseline/`; changes to the active `tests/visual-core/`
fixtures need explicit geometry review and recorded provenance.

`npm run build` compiles only `src/core/` into the external embedding distribution
in `dist/`. Its input graph must contain no Vue or UI code. Keep Pages deployment
on native source, retain standalone dependency licenses, and do not commit dist.
The bundle workflow runs on push/release; npm publishing is a separate existing
release workflow. Do not publish a release or merge PRs without authorization.
