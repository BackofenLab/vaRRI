# Vue browser ESM

`vue.esm-browser.prod.js` is the unmodified Vue **3.5.22** full browser ES-module
distribution, including its runtime template compiler. It was retrieved from
`https://cdn.jsdelivr.net/npm/vue@3.5.22/dist/vue.esm-browser.prod.js` and is served
locally through the viewer's import map. `VUE-LICENSE.txt` preserves its MIT license.
The production filename is intentional: this is the full native browser ESM
build with the template compiler, not the runtime-only or bundler ESM build.

Components are ordinary `.js` objects with template strings. The browser imports
this checked-in asset directly; developing or serving the viewer never compiles
it. The core bundle has no dependency on Vue or anything in `src/ui/`.

Upstream documents the native ESM/import-map setup in the
[Vue quick start](https://vuejs.org/guide/quick-start.html#using-the-es-module-build).

`marked.js` is the minified native ESM distribution from the locked development
dependency, Marked 18.0.9, with `MARKED-LICENSE.txt`. It renders trusted Markdown
descriptions from the bundled example catalog. User-entered sequences and form
values use Vue text bindings, not Markdown or HTML interpretation.

The checked-in production bytes, their license files, and this provenance document
are pinned by SHA-256 in `scripts/vendor-manifest.js`. All these vendor code files
meet the 400-line limit. The checker validates their integrity before recognizing
them as third-party assets; newly authored code cannot acquire a syntax exemption
merely by being placed in this directory.

The pinned Marked package source is available from the
[18.0.9 package](https://www.npmjs.com/package/marked/v/18.0.9) recorded with its
download integrity in `package-lock.json`. The minified ESM asset retains that
dependency's exports and is already available for zero-build browser use.
