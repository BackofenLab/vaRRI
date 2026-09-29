# Vue browser ESM

`vue.esm-browser.prod.js` is the unmodified Vue **3.5.22** full browser ES-module
distribution, including its runtime template compiler. It was retrieved from
`https://cdn.jsdelivr.net/npm/vue@3.5.22/dist/vue.esm-browser.prod.js` and is served
locally through the viewer's import map. `VUE-LICENSE.txt` preserves its MIT license.

Components are ordinary `.js` objects with template strings. The browser imports
this checked-in asset directly; developing or serving the viewer never compiles
it. The core bundle has no dependency on Vue or anything in `src/ui/`.

Upstream documents the native ESM/import-map setup in the
[Vue quick start](https://vuejs.org/guide/quick-start.html#using-the-es-module-build).

`marked.js` is the minified native ESM distribution from the locked development
dependency, Marked 18.0.9, with `MARKED-LICENSE.txt`. It renders trusted Markdown
descriptions from the bundled example catalog. User-entered sequences and form
values use Vue text bindings, not Markdown or HTML interpretation.
