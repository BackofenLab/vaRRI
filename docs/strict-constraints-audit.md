# Audit against issue #83's strict constraints

Source requirement: [Martin's issue #83](https://github.com/BackofenLab/vaRRI/issues/83).
Three reviewers independently examined language/tooling, vendor provenance, and
compatibility, discussed their findings, and unanimously agreed to the corrections
below before implementation. Their agreement is an implementation decision, not
an approval attributed to Martin.

| Requirement | Implementation and enforcement |
| --- | --- |
| Modern JavaScript, native ES modules, `.js` only, no TypeScript | All authored application code, tests, distribution tools, and page controllers use `.js` ESM. Root `type: module` and native Jest VM modules replace CommonJS and the custom test transform. The old Python smoke helper is now JavaScript with the same CLI. |
| No compilation step for running the application | `index.html`, `README.html`, and `citation.html` use external native module controllers. All application modules and script dependencies are local. Pages serves source directly. Browser checks block `dist/`, `node_modules/`, and the legacy Fornac/D3 scripts. Node and esbuild are test/distribution tools only. |
| Vue 3 browser ESM and JS component objects with templates or `h()` | The pinned full Vue 3.5.22 production browser ESM build includes the template compiler. It is the production variant of the browser ESM runtime named in the issue; no SFC or preprocessing is used. |
| D3 nodes, forces and selections outside Vue reactivity | The API stays in bootstrap/action closures; graph and force state remain in the core. Vue holds form values and copied annotation data. Browser tests inspect live graph nodes and recursively check the UI store. |
| Maximum 400 lines per file; single responsibility | The checker covers authored code, documentation, configuration, and executable vendor assets. The README is split into viewer and input/sharing guides; browser help composes the complete content and preserves anchors. Vendor assets must pass line limits before their upstream syntax exemption applies. |

## Vendor compatibility and integrity

The legacy `fornac/d3.js` package export now contains the exact official production
asset from D3 3.4.13, the same version previously retained as readable upstream
source. Its provenance record links the immutable original source and hashes.
Both D3 license files now contain that version's historical BSD 3-clause license.
There is no D3 engine upgrade and no minification of authored application code.

The native core's existing adapted D3 factory remains byte-preserved internally.
A separate readable module owns its lazy per-document cache and validates the
browser document. The factory, legacy distributions, Vue, and Marked have exact
asset/license/provenance records in `scripts/vendor-manifest.js`. Tampered assets,
missing licenses, missing provenance, and vendor files above 400 lines fail checks.

Only retained third-party UMD package assets use a CommonJS package scope.
Authored source does not use CommonJS. The generated `dist/varri.cjs` entry still
supports existing npm consumers; generated distribution output is deliberately
separate from the zero-build source application.

## Model and URL compatibility

The model graph stays inside `src/core/model/`, with no DOM, Vue, canvas, or
renderer-session dependency. Headless imports and data operations are checked
with throwing `document` and `window` getters. The core bundle's input graph
contains only `src/core/` files; its workflow runs on push/published release.

The first audit corrected two bugs: model helpers received a mixed renderer
session despite needing only plain data, and the URL codec lost multi-range
highlights and non-hex model colors. Model operations now receive `modelState`.
Multi-range highlights remain one annotation. Non-hex annotation colors use an
additive `css~` URI-escaped token; existing valid hex links are unchanged.

## Scope and verification

Generated `package-lock.json` data, ignored `dist/` distribution output, and test
diagnostics are explicit generated-file categories. A literally every-file
reading of the 400-line sentence would still include npm's generated lockfile.
This audit does not claim that generated data is below that limit or that Martin
approved an exception. Static checks also do not prove all possible runtime
behavior, so browser and installed-package checks remain required.

Verification commands are listed in [AGENTS.md](../AGENTS.md). They cover native
ESM tests, negative architecture cases, installed CJS/ESM and legacy vendor
exports, native/standalone rendering parity, Vue forms, composed help, citation
tabs/downloads, and the five unchanged visual fixtures.

Follow-up validation: 325 tests in 26 suites pass, including 62 architecture
cases and four vendor runtime regressions. The checker covers 198 text files
and 130 native modules. Native/standalone rendering, Vue controls, help/citation
pages, and the migrated smoke helper pass. The final packed-package check also passes. All five visual fixtures retain exact
SVG scenes and zero changed pixels; committed baselines are unchanged.
