# Static linear layouts (issue #101)

Both linear options are independent of Force layout in the UI, URL state,
examples, and standalone rendering API. They appear above Force layout in
Visualization Settings. Disabling Force layout keeps either linear option
selected; free trailing ends and pseudoknot pulling remain force-only options.

The existing rail projection and D3 engine are unchanged. With animation off,
applicable helices settle for at most 60 synchronous force ticks. The renderer
then removes linear tick/end listeners and stops the force before returning
control. Annotation placement and viewport fitting use the settled coordinates.
No nodes are fixed by this initialization, and no background overlay animation
is started. Manual moves, release, reset, undo, exports, cancellation, and
rerendering keep their static-layout behavior.

## Geometry review

Compared ordinary static rendering against both linear options enabled with
Force layout off on 7 October 2026, using Chromium 153.0.8010.12, an 800×600
render-only viewport, seed 83, and each example's existing cropping/annotations.
The source is based on `a6743a2` with the changes in this issue's pull request.
Screenshots and measurements were saved under
`output/playwright/static-linear-review/` for inspection, not as new baselines.

- `2mol`: the RRI axis becomes horizontal; the intramolecular stem straightens.
  All 47 graph nucleotides and the colored annotations remain visible.
- `coronel-tellez-2022`: the bent interaction becomes horizontal; all 92 graph
  nucleotides, probability colors, labels, and region overlays remain present.
- `wu-2024`: the interaction straightens while retaining the large unpaired loop,
  all 61 graph nucleotides, signed biological labels, and mutation labels.
- `IntaRNA-seeds`: the long interaction becomes horizontal with its unpaired
  loops and seed highlights retained; all 127 graph nucleotides remain present.
- `crossing-rri`: the existing crossing-pair restriction leaves the 30-node graph
  unchanged because it has no applicable noncrossing rail template.

All ten compared scenes stayed motionless after rendering. The original five
visual regression fixtures still match exactly with linear options disabled;
no baselines were replaced. Automated tests additionally check each linear
option separately, both together, unpaired/crossing inputs, rail spacing,
listener cleanup, cancellation, native/bundle parity, static release/undo,
SVG output, and URL/example/control state.
