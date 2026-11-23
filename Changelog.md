# vaRRI changelog

## Version 2.X · DATE


### Development history


## Version 2.0.0 · 2026-11-23

### Viewer and sharing

- Save and restore editable JSON sessions, including settings, annotations, and probability profiles. Built-in examples use the same format.
- Place styled text and strand names on the canvas, highlight paired positions from the input, and set PNG dimensions and DPI.
- Select, move, rotate, release, and undo groups of nodes. View and positioning controls are docked on the right.
- Open captioned video guides beside viewer controls. Turn off **Show help video on hover** for click-only guides, or share a link with `showHelpVideoOnHover=0`.

### Layout and embedding

- The native Vue 3 viewer runs from static HTTP. A DOM-free model and an instance-scoped D3 7 canvas support independent embeds, headless validation, and cancellation.
- Explicit strand boundaries preserve real nucleotide indices, signed biological numbering, and unique base pairs. Hidden layout vertices separate strands. Linear helices also work in static mode, and stacked pseudoknots have stronger support during dragging.
- The public vaRRI API, existing share-link encodings, and SVG/PNG exports carry forward. Native ESM, CommonJS, and classic-script embeds share the core, with package, browser, and visual checks in CI.
- The package drops the old Fornac and D3 3 scripts and maps. For a static source embed, link `src/core/canvas/graph/structure.css`. The standalone bundle includes `fornac.css` and its Apache 2.0 license.

### Development history

- 2026-11-23 13:09 UTC — Added a reviewable release-preparation workflow for package and citation metadata (extends `f19924b`).
- 2026-11-20 16:27 UTC — Removed the Fornac and D3 3 scripts, source maps, and layout comparison tests from the package. (`7b19c0a`)
- 2026-11-20 16:27 UTC — Added click-only video guides through Visualization Settings and the shareable `showHelpVideoOnHover` option. (`db2d9db`)
- 2026-10-31 21:19 UTC — Narrowed the right-hand view controls and aligned the manual positioning buttons. (`21b4ab7`)
- 2026-10-31 20:57 UTC — Added accessible playback and enlargement controls to the contextual video guides. (`42369fa`)
- 2026-10-31 01:29 UTC — Made canvas interaction close the view controls and guarded Release by selection and layout mode. (`026b1c7`)
- 2026-10-31 01:22 UTC — Enabled previews on hover or focus for the play icons beside viewer controls. (`e5577fe`)
- 2026-10-31 00:59 UTC — Added walkthroughs beside input, highlighting, and annotation controls. (`ce49b9f`)
- 2026-10-30 20:10 UTC — Docked view controls over the right edge of the canvas. (`33bbfda`)
- 2026-10-28 15:52 UTC — Added contextual WebM demonstrations to the viewer and help page. (`29cadb0`)
- 2026-10-28 15:04 UTC — Added a reproducible browser recording pipeline for help videos. (`45bca59`)
- 2026-10-27 16:47 UTC — Made the built-in examples load from editable JSON sessions. (`0312a89`)
- 2026-10-27 16:08 UTC — Corrected mutation endpoint labels and the example dropdown layout. (`0b83b04`)
- 2026-10-23 12:01 UTC — Added local JSON session import and export for settings, profiles, and annotations. (`d1014dc`)
- 2026-10-07 13:56 UTC — Enabled linear helix layouts with force animation switched off. (`ad0f55f`)
- 2026-10-07 09:45 UTC — Added controls to select and release manually moved nodes. (`60d0160`)
- 2026-10-05 20:58 UTC — Stabilized stacked pseudoknot pairs using the same force constraints as ordinary helices. (`8a5efe2`)
- 2026-10-05 20:54 UTC — Added grouped dragging, selection rotation, and reversible manual positioning. (`9d6b04d`)
- 2026-10-01 12:12 UTC — Linked input highlighting to the matching nucleotide and its base-pair partner. (`d4277fb`)
- 2026-10-01 10:07 UTC — Added configurable PNG dimensions and DPI. (`4c84807`)
- 2026-10-01 09:41 UTC — Synchronized strand names with their editable labels. (`6226ed1`)
- 2026-09-30 20:43 UTC — Added draggable, styled text annotations. (`e649b8e`)
- 2026-09-30 18:15 UTC — Upgraded to D3 7.9.0 and adapted force simulation, dragging, and zoom. (`1ac38f4`)
- 2026-09-30 18:04 UTC — Restored loop and stem constraints and added two invisible layout vertices at strand breaks. (`ddb00d7`)
- 2026-09-29 18:50 UTC — Fixed model-state isolation and round trips for grouped ranges and CSS colors in share links. (`a9a10b6`)
- 2026-09-29 18:06 UTC — Automated standalone core builds and introduced architecture and distribution checks. (`0f7cb7f`)
- 2026-09-29 17:57 UTC — Rebuilt viewer forms and dialogs as native Vue 3 components. (`da2c5fe`)
- 2026-09-29 17:40 UTC — Split out a DOM-free model and independent D3 canvas with explicit strand boundaries. (`d0cee0a`)
- 2026-09-29 17:27 UTC — Introduced the native ES module entry and captured five reference visualizations. (`2c2678f`)

## Version 1.0.2 · 2026-09-11

- **Embedding** — Fixed SVG rendering and documented external embeds.
- **Package** — Renamed the repository and viewer to vaRRI while keeping the npm package name `varri-js`.

- 2026-09-10 15:43 UTC — Kept the existing npm package name after the repository rename. (`1562734`)
- 2026-09-10 13:52 UTC — Added embedding examples. (`d4cf084`)
- 2026-09-10 13:39 UTC — Fixed SVG rendering. (`e95d4ea`)

## Version 1.0.1 · 2026-09-09

- **Package** — Included the complete browser viewer and its assets in the npm release.

- 2026-09-08 14:36 UTC — Packaged the full viewer with the library. (`921d2ef`)
- 2026-09-04 13:07 UTC — Automated npm publication from GitHub releases. (`f19924b`)

## Version 1.0.0 · 2026-08-18

- **Input and layout** — Render one or two RNA strands from IUPAC sequences and dot-bracket structures, with FASTA import, signed start indices, cropping, and literature examples. Fornac supplied static and force-directed layouts, linear helices, and optional pseudoknot pulling.
- **Annotations** — Color by strand or loop, highlight interactions and subsequences, label point mutations, and overlay per-nucleotide probability profiles.
- **Sharing and output** — Rotate figures, export self-contained SVG or PNG, share settings and annotations by URL, and embed the viewer or its JavaScript API.

[Version 1.0.0 source and manual](https://github.com/BackofenLab/vaRRI/tree/v1.0.0)
