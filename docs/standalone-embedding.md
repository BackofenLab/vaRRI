# Standalone core embedding

The `Standalone core bundle` GitHub Actions workflow builds an artifact on every
push and published release, or when manually dispatched. Download the
`varri-core-<commit>` artifact from that run. It contains `varri.min.js`, source
maps, the compatible stylesheet, licenses, and a CommonJS entry. The older
`vaRRI.min.js` spelling remains an alias.

Serve the extracted files with your website. No Vue or Fornac JavaScript needs
to be loaded:

```html
<link rel="stylesheet" href="fornac.css">
<script src="varri.min.js"></script>
<div id="rna-viewer" style="width: 800px; height: 600px"></div>
<script>
  const viewer = vaRRI.createVaRRI();
  const data = viewer.validate({ sequence: 'ACGU&UGCA', structure: '((..&..))' });
  viewer.render('rna-viewer', data, { forceLayout: false });
  // Before removing the viewer: viewer.cancelActiveRender();
</script>
```

`varri.min.js` contains the native core and its pinned D3 runtime. Its build
rejects dependencies outside `src/core/`; the full Vue viewer is never bundled
into this artifact. Retain the `licenses/` directory when redistributing it.
SVG exports inline computed styles and are self-contained.

Run `npm ci` and `npm run build` to reproduce the artifact locally. This build is
only for external embedding and package distribution. Developing or deploying
the source viewer needs only a static HTTP server: GitHub Pages serves the native
modules directly. Generated files in `dist/` are not committed.
