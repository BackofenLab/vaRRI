# Issue #83: zero-build architecture migration

Tracking issue: https://github.com/BackofenLab/vaRRI/issues/83

## Review gates

Each phase has its own branch and pull request. Run the applicable unit,
installed-package, and browser checks before opening that PR and starting the
next phase. Later PRs are stacked on the preceding phase so each review shows
only that phase's changes. Do not merge or publish releases automatically.

| Phase | Deliverable | Status |
| --- | --- | --- |
| 1 | Native ESM entry/import map, original visual baseline, this protocol | [PR #87](https://github.com/BackofenLab/vaRRI/pull/87) |
| 2 | DOM-free model, independent D3 canvas, strand-boundary fix, architecture docs | [PR #88](https://github.com/BackofenLab/vaRRI/pull/88) |
| 3 | Native Vue 3 JS components, complete legacy URL compatibility | [PR #89](https://github.com/BackofenLab/vaRRI/pull/89) |
| 4 | Standalone core bundle workflow and enforced contributor rules | [PR #90](https://github.com/BackofenLab/vaRRI/pull/90) |

## Council decision

The core, UI, and regression reviewers agreed to preserve the existing D3
version and RNA layout algorithms during extraction. Upgrading the force engine
at the same time would make visual differences harder to diagnose. Vue owns
forms and serializable presentation state; the core owns nodes, SVG elements,
force simulations, event listeners, and disposal. No D3 object enters a Vue
reactive container.

Phase 1 is explicitly transitional: its ESM entry imports the old implementation
through short compatibility bridges. It does not claim that the legacy files
already satisfy the final modular architecture. Subsequent phases remove those
bridges, the raw Fornac dependency, and the monolithic UI implementation.

## Development without a build

Serve the repository with any static HTTP server and open `index.html` in a
modern browser. For example, `python3 -m http.server 8080` is sufficient. Node,
npm, bundling, and transpilation are not required to run the source. Browsers
restrict native module loading from `file://`, so double-clicking the viewer is
no longer the supported development workflow. This is zero-build, not zero-HTTP.

`index.html` contains the import map. `src/main.js` is the module entry point.
Vue is pinned to its full browser ESM distribution, which supports JS component
objects with template strings. No `.vue` files or TypeScript are introduced.
The distributable bundle is for external embedding only.

## Old-to-new path map

| Existing responsibility | Destination |
| --- | --- |
| `src/vaRRI.js` public API | `src/core/index.js`, compatibility entry |
| Constants, colors, registries | `src/core/model/` state modules |
| Input validation, dot-bracket pairs | `src/core/model/` validation and structure modules |
| Sequence formatting, cropping, biological indices | `src/core/model/` sequence and indexing modules |
| Annotation definitions and registry operations | `src/core/model/` annotation modules |
| Intermolecular pairs and helix groups | `src/core/model/` interaction modules |
| Fornac graph/layout internals | `src/core/canvas/` graph and layout modules, with attribution |
| SVG setup, styles, labels, tooltips | `src/core/canvas/` drawing modules |
| Highlights, mutations, probability overlays | `src/core/canvas/` annotation modules |
| Linear helix projection and force lifecycle | `src/core/canvas/` force modules |
| Rendering, cancellation, rotation, export | `src/core/canvas/` lifecycle and export modules |
| `index.js` defaults and serializable UI state | `src/ui/` state module |
| FASTA/profile/color parsing | `src/ui/` focused services |
| Legacy share-link parsing and serialization | `src/core/model/` URL state and `src/ui/` URL adapter |
| Sequence, layout, profile, annotation controls | `src/ui/` Vue JS components |
| Dialogs, examples, export, event wiring | `src/ui/` controllers and bootstrap |
| Browser startup | `src/main.js` |
| `index.html` form markup | Vue component templates in `src/ui/` |
| `style.css` | Focused stylesheet imports retaining existing presentation |

Modules must have a coherent responsibility and stay within 400 lines. Do not
hide an oversized source file behind generated line compression or numbered
chunks. Preserve third-party license notices when extracting existing code.

## Compatibility and strand boundaries

Preserve the namespace API, default import, embedding use, annotation semantics,
examples, export, and biological numbering (including negative positions and
the skipped zero). Maintain all existing URL names and encodings, including
annotation styles, profiles, rotation, force options, and render-only mode.
Generated region highlights must not become persisted user annotations.

Before phase 2, the implementation inserted three gap nucleotides because Fornac's
strand-break conversion otherwise hid real nucleotides. Phase 2 represents
strand boundaries directly, excludes cross-strand backbone links, and builds
each base pair once. Internal contiguous node IDs can change; biological indices
in the model and URLs must not. Removing the artificial gap can legitimately
change initial polygon geometry. Such differences need explicit review against
the phase-1 baseline and must never be accepted by silently replacing it.

## Verification

The starting point is upstream commit `4cc97df`. Its five Jest suites contain
203 passing tests. Keep meaningful behavior assertions as modules move; adapt
tests that specifically describe padded internal node IDs when that contract
is deliberately replaced.

- Run `npm run test:ci` for model, annotation, UI, and publication behavior.
- Run `npm run test:package` against the packed and installed distribution.
- Run the browser visual baseline against a static server: fixed viewport,
  seeded randomness, animation disabled, checked SVG geometry and PNG output.
- Exercise animated force layouts separately for finite positions, correct
  nucleotide/base-pair counts, constraints, and cancellation.
- Exercise the actual native ESM graph; a CommonJS-only test is not proof of
  zero-build browser operation.
- Compare native source and standalone core embedding without loading Vue.
- Enforce module size and dependency boundaries in the final CI phase.

## Phase records

### Phase 1

The viewer now enters through native `src/main.js`; an import map resolves the
core and the pinned Vue browser ESM distribution. Existing scripts are imported
in dependency order. The npm package includes the new source paths. Fornac and
D3 remain unchanged for the baseline, and Vue UI migration starts in phase 3.

Validation: all 203 Jest tests pass; the packed/installed npm consumer passes;
all five original browser fixtures match exactly (SVG scene equality and zero
changed pixels). The browser also dynamically imports `src/main.js` and resolves
`varri` through the import map to verify the live native module graph.

Run `npm run test:visual`; see [baseline provenance and instructions](tests/visual-baseline/README.md).
The phase-1 PR links this protocol, and later phase records link preceding PRs.

### Phase 2

The public API now delegates to focused native model/canvas modules. The
`createVaRRI()` factory isolates colors, annotation registries, DOM queries, and
render cancellation per viewer. Default/named exports retain the singleton
interface. The core imports headlessly and initializes its pinned D3 runtime
only when rendering into a document.

The graph directly models strand boundaries and builds real nucleotide IDs
without padding. It contains each base pair once and no cross-strand backbone
link. Pinned polygon/loop algorithms retain license and source provenance.
Exterior force hubs are explicitly tagged so free ends release only those
constraints. See [force-field-graph.md](docs/force-field-graph.md) and
[visualization-architecture.md](docs/visualization-architecture.md).

All five prospective browser images were visually reviewed against the original
fixtures. Colors, biological labels, mutations, profiles, and annotation counts
remain present. Two-strand coordinate shifts follow the removal of three
artificial polygon vertices; terminal bases and nearby labels consequently move.
The original baseline remains unchanged, and a separate core baseline records
this intentional geometry change. No renderer algorithm or D3 version upgrade
is mixed into this migration.

The npm package now resolves ESM imports to source and CommonJS to the standalone
core artifact. The classic bundle includes D3 and retains the mixed-case URL as
an alias. The source viewer does not load the old Fornac or D3 scripts.

Phase-2 validation: 221 tests in 21 suites pass; the installed package resolves
native ESM, the pure model, and CommonJS correctly. Real-browser checks pass for
native/bundle scene equality, contiguous graph IDs, independent instances,
animated cancellation/rerender, and SVG/PNG downloads. The separately reviewed
[core baseline](tests/visual-core/README.md) records source commit `d0cee0a`.

### Phase 3

The viewer now mounts native Vue 3 JavaScript components. Vue owns form values,
errors, messages, annotation lists, dialogs, and example selection. Focused
controllers preserve FASTA parsing, biological profile indices, validation,
annotation editing, and URL synchronization. The renderer remains an ordinary
core instance outside reactive state. The legacy global bridge is removed.

The full Vue browser ESM runtime and Markdown caption parser are pinned local
assets with licenses and provenance. Styles are split by responsibility without
changing their cascade. Owned UI modules remain below 400 lines. Mount/unmount
and Clear cancel rendering and pending UI work and clean up listeners and timers.

Phase-3 validation: 231 tests in 23 suites cover the mounted Vue controls,
serializable state, validation errors on their corresponding fields, and queued
example cancellation. Real-browser checks cover all five
examples, sequence edits, FASTA import, all three annotation editors, profiles,
force controls, rotation, share-link restoration, rendering-only mode, and
SVG/PNG downloads. All five visual fixtures preserve exact SVG scene equality
and zero changed pixels against the unchanged phase-2 core baseline. The packed
package and native/standalone renderer parity checks also pass.

### Phase 4

The standalone bundle workflow runs on push and published release. It builds
`dist/varri.min.js` from the core entry, rejects any non-core build input, and
uploads the embedding distribution with source maps, compatible CSS, and all
dependency licenses. Pages continues serving native source without a build.
See [standalone-embedding.md](docs/standalone-embedding.md).

[AGENTS.md](AGENTS.md) documents the module boundaries, JavaScript/native-ESM
rules, Vue reactivity boundary, 400-line limit, compatibility contracts, and
verification commands. The architecture checker parses native imports and
rejects reverse dependencies, browser state in the model, unsupported source
formats, missing import targets, generated runtime dependencies, and oversized
authored files. Vendor exemptions name specific licensed assets.

PR CI now runs architecture, unit, installed-package, core-browser, Vue-browser,
and visual checks. Failures retain screenshots, page HTML, scene data, and browser
metadata. A deliberately corrupted temporary baseline confirmed that failures
are detected and produce useful diagnostics; neither baseline was rewritten.

The council's final review confirmed all 81 original public API functions remain
available. Locally, all browser checks and five zero-pixel-difference visual
fixtures pass on pinned Playwright Chromium, and the standalone installed package
passes with its stylesheet and licenses. The full suite has 266 passing tests,
including 35 architecture cases; 132 authored files and 86 native modules pass
the boundary checker. Each completed phase has a separate
stacked PR; review and merge them in order, retargeting subsequent PRs to main as
their dependencies land.
