# Phase 5: D3 7 compatibility and upgrade

This phase is stacked on PR #90 after its layout corrections. It addresses the
separate [D3 investigation requested by Martin](https://github.com/BackofenLab/vaRRI/pull/90#issuecomment-5912123406).

## Decision

D3 **7.9.0** is compatible after adapting the canvas integration. It is the
[latest upstream release](https://github.com/d3/d3/releases/tag/v7.9.0), also
confirmed by npm on 30 September 2026. The native viewer and standalone core now
use that version. No runtime CDN, new application build step, or Vue dependency
is introduced. Headless imports and per-Document isolation remain supported.

The retained `fornac/d3.js` export stays at 3.4.13 for the retained original
Fornac consumer API. The application does not import either legacy script.
Replacing that compatibility file with D3 7 would break original Fornac's v3 API.
The core vendors the new factory and exact ISC license; see
[asset provenance](../src/core/vendor/README.md) and the enforced vendor hashes.

## Integration changes

| D3 3 dependency | D3 7 integration |
| --- | --- |
| `layout.force()` | `forceSimulation`, `forceLink`, `forceManyBody` |
| Implicit `px`/`py` velocity | Explicit `vx`/`vy`, synchronized at each force step |
| `fixed` bit/flag | Map existing fixed nodes to `fx`/`fy` each step |
| Friction 0.35 | Velocity decay 0.65 |
| Start/resume and cooling | Restart at alpha 0.1, decay 0.01, minimum 0.005 |
| `geom.quadtree` / `quad.point` | `quadtree` / leaf `data` and coincident-point chains |
| `behavior.drag`, global `d3.event` | `drag`, explicit event and datum arguments |
| `behavior.zoom`, scale/translate | `zoom`, `zoomIdentity`, stored zoom transforms |

The [modern simulation contract](https://d3js.org/d3-force/simulation) uses
explicit velocities and fixed coordinates. The canvas adapter carries RNA rail
projections and rotations into those velocities before each step, then exposes
previous positions again before the existing projection listeners run. It
preserves the internal start/resume/tick listener interface used by vaRRI; it
does not emulate or load the old engine.

[Modern link forces cache strengths and distances](https://d3js.org/d3-force/link).
Restarting explicitly refreshes those caches after changing pseudoknot strength
or removing exterior helpers. Old link arrays are cleared before replacing
nodes. Stopping does not emit convergence or restart a cancelled simulation.

The subsequent #74 interaction update measures pointer movement through each
element's zoomed and rotated coordinate frame. Ctrl-click and rectangle selection
include nucleotides, numbering, and text. Dragged graph nodes remain fixed for the
current rendering; text positions update the model. Disposal detaches active
gestures and prevents late callbacks from restarting the old simulation. Programmatic fitting updates D3's stored zoom transform,
so subsequent wheel and pan gestures start at the fitted view.

## Verification and visual review

- Native and standalone core scenes agree. All five animation-off fixtures
  from the reviewed phase-4 correction retain exact SVG scenes and zero changed
  pixels. No fixture or polygon algorithm changes are included in this phase.
- The all-in-one force layout was visually inspected with linear RRI disabled.
  Modern force integration produces small coordinate differences, as expected;
  stems, loop gaps, and visible topology are preserved. The initial/settled mean
  radii are 33.47/31.08 for the outer loop and 18.33/18.88 for the strand gap,
  within the existing 15% regression bound.
- Every example is exercised through ordinary force layout, both linear
  options, and free trailing ends with crossing-pair forces. Checks require
  convergence, finite coordinates, intact endpoints, real nucleotide counts,
  and projected rail widths.
- Tests verify fixed nodes, changed pseudoknot strengths, projected velocities,
  graph replacement, one convergence event, and cancellation. Real browser
  gestures cover zoom-aware dragging, Ctrl-selection, wheel zoom, pan, and
  cancellation during a drag for both native and bundled consumers.
- Architecture/vendor integrity, unit tests, installed CJS/ESM package contents,
  Vue workflows, help/citation pages, and SVG/PNG exports are checked separately.

The upgrade does not promise pixel-identical animated trajectories between D3
versions. The unchanged topology and force constraints, bounded loop geometry,
reviewed rendering, and lifecycle tests establish compatibility for this viewer.
