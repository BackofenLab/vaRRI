# Audit against issue #83's strict constraints

Source requirement: [Martin's issue #83](https://github.com/BackofenLab/vaRRI/issues/83).
This audit distinguishes verified application behavior from exceptions introduced
by the implementation. The issue does not explicitly exempt tooling or vendors.

| Requirement | Finding |
| --- | --- |
| Modern JavaScript, native ES modules, `.js` only, no TypeScript | Application source passes. Nine tracked Node test/build helpers use CommonJS `.cjs`, so the repository does not meet a literal all-code reading. |
| No compilation step for running the application | Pass. `index.html` loads `src/main.js` with `type="module"`; the import map and all runtime modules are local. Pages serves source directly. Browser checks block `dist/`, `node_modules/`, and the legacy Fornac/D3 scripts. Node and esbuild are test/distribution tools only. |
| Vue 3 browser ESM and JS component objects with templates or `h()` | Pass for the requested runtime architecture. The pinned asset is the full Vue 3.5.22 **production** browser ESM build, `vue.esm-browser.prod.js`, rather than the development filename `vue.esm-browser.js` named in the issue. It includes the template compiler; no SFC or preprocessing is used. |
| D3 nodes, forces and selections outside Vue reactivity | Pass. The API stays in bootstrap/action closures; graph and force state remain in the core. Vue holds form values and copied annotation data. The sole authored `reactive()` call creates that plain UI store. |
| Maximum 400 lines per file; single responsibility | Authored application code, HTML/CSS, and tests pass. The largest authored code file is 347 lines. However, retained upstream `fornac/d3.js` is 9,215 lines and exempt from the checker. A literally all-files reading also includes the larger README and generated package lock. |

The `.cjs` helpers are `scripts/{browser-invariants,browser-ui,build-core,
check-architecture,check-package,release-metadata,visual-baseline}.cjs`,
`tests/esm-transform.cjs`, and `tests/helpers/vue-viewer.cjs`. They never load
in the browser, but that does not resolve the issue's unqualified wording. The
Jest tests also retain CommonJS harness imports rather than being native ESM.

The old `fornac/d3.js` is retained for the historical package export and source
provenance. The application imports `src/core/vendor/d3.js` instead. Keeping the
original asset is a compatibility choice, not an exemption granted by Martin.

## Additional architecture and compatibility checks

The model import graph stays inside `src/core/model/`, with no DOM, Vue, canvas,
or session dependency. Headless imports and data operations also pass with
throwing `document` and `window` getters. The core bundle's actual input graph
contains only `src/core/` files, and its workflow runs on push/published release.

This audit found two implementation problems beyond the five strict bullets:
model helpers received a mixed renderer session despite needing only plain data,
and the URL codec lost data for multi-range highlights and non-hex model colors.
The corrective changes separate model state and add URL round-trip regressions.
Multi-range highlights remain one annotation. Non-hex annotation colors use an
additive `css~` URI-escaped token; existing valid hex links are unchanged.

Verification after correction: 294 tests in 25 suites pass, including model-state
serialization and CSS/range URL regressions. The installed-package check and all
three browser suites pass. All five visual fixtures retain exact SVG geometry
and zero changed pixels. The native UI browser check inspects actual D3 nodes
for Vue proxies and recursively verifies the live UI store contains only data.

The architecture checker is a useful static guard, not a complete proof of every
possible JavaScript runtime behavior. Its success does not authorize its scope
exceptions or prove a literal repository-wide reading of the requirements.

## Remaining compliance decision

Unqualified full compliance cannot be claimed while the CommonJS tooling and
oversized retained vendor source remain. Meeting the literal all-code reading
requires migrating the tooling and resolving the legacy vendor export/source
retention; accepting an application-source scope requires an explicit requirement
clarification. Existing green tests do not settle that choice.
