# PR #90 layout review

Request: [Martin's review, 30 September 2026](https://github.com/BackofenLab/vaRRI/pull/90#issuecomment-5912123406).
Tasks 1–4 belong to phase 4. The D3 version investigation is a separate phase-5
PR stacked on phase 4.

## Findings and corrections

- The seq1-end/seq2-start gap had no virtual polygon vertices after the migration.
  Two explicitly typed strand-break helpers now enlarge that loop in both the
  polygon coordinates and force constraints. They are not sequence characters,
  real nucleotide IDs, labels, or visible backbone/base-pair links.
- The seq1-start/seq2-end exterior hub omitted the two closure helpers created
  by Fornac's `reinforceLoops`. This reduced the spring rest radius during
  animation. Their original participation is restored: count both vertices in
  polygon distances; allow incoming chords; do not originate spokes from them.
- Hidden chords were deduplicated. Fornac's `addFakeNode` creates a spoke and an
  over-neighbor chord from each loop/stem vertex, plus an across-loop chord for
  polygons larger than four vertices. Reciprocal/overlapping hidden springs
  reinforce the geometry and must remain separate. Stem-first construction,
  sorted loop order, hub radii, and shared-member hub links follow Fornac.
- Successful rendering no longer displays the ready/export message. Validation
  and rendering errors remain visible; browser checks await the visible canvas.

The oracle loads the unmodified checked-in Fornac and D3 browser assets, with
network access disabled. It compares every hidden spring endpoint, multiplicity,
and length for stacked stems, hairpins, interior loops, multiple stems, and an
unpaired exterior. Modern code uses `Math.PI` instead of upstream's truncated
constants; distances agree to three decimal places.

Intentional differences remain: one visible link per real base pair, explicit
strand boundaries, virtual helpers without biological identity, safe collision
handling for fixed/coincident nodes, and scoped disposal. The original workaround
that changed real nucleotide nodes into hidden nodes is not restored.

## Geometry review and validation

The five examples were captured with Chromium 153.0.8010.12, seed 83, animation
off, and compared side by side with the phase-2 core fixtures. Their visible
nucleotide/link/annotation counts are unchanged. Two-strand endpoint gaps and
nearby loop geometry change as requested; signed labels, mutations, accessibility
colors, crossings, and highlights remain visible. Original fixtures in
`tests/visual-baseline` and `tests/visual-core` are preserved. The new active
fixtures in `tests/visual-review-90` identify their exact source revision.

For the all-in-one example with linear RRI disabled, the mean distance of real
loop members from their centroid changes from 33.47 to 30.98 for the outer loop
and 18.33 to 18.55 for the strand-break loop after 400 force ticks. A regression
requires both settled radii to stay within 15% of their initial values. Helper
nodes stay absent from the SVG, and free trailing ends remove the helpers and
their exterior constraints while retaining all real nodes and interior forces.

Architecture, native ESM unit tests, installed-package checks, native/bundle
parity, cancellation, Vue controls, help/citation pages, and SVG/PNG exports pass.
