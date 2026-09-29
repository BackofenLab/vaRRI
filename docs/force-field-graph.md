# RNA force graph

The canvas constructs its own graph in
[`structure.js`](../src/core/canvas/graph/structure.js). It uses the pinned D3
3.4.13 force engine and extracted RNA layout algorithms, with provenance and
Apache licensing in [`NOTICE.md`](../src/core/canvas/graph/NOTICE.md).
It never instantiates or loads `fornac.js`.

## Nucleotides and strand boundaries

There is one nucleotide node per real sequence character. IDs are contiguous,
one-based integers across both strands. `&` is a boundary marker, not a node.
The graph stores the end index of each strand in `breaks`. Backbone links join
adjacent nucleotides only within a strand; each base pair is added once.

The old implementation inserted three dots after `&` to compensate for
Fornac's conversion of break-adjacent nucleotides into invisible nodes. That
padding and the later DOM removal are gone. Biological positions are computed
by `model/indexing.js`, including negative offsets and skipping zero. Internal
IDs are not biological positions and should not be persisted in share links.

## Coordinates and crossings

The initial coordinates use the original polygon algorithm in
`graph/coordinates.js`. Maximum-cardinality planarization chooses a noncrossing
subset for initial layout; the complete pair table is retained. Crossing pairs
are visible `pseudoknot` links. Their force strength is initially zero and can
be raised by `pullPseudoknotBasepairs`.

Removing padding changes two-strand polygon geometry even with animation off.
The original phase-1 screenshots remain immutable reference fixtures. New
fixtures must be reviewed for topology, labels, highlights, and export as well
as shape; see the [migration protocol](../MIGRATION_PROTOCOL.md).

## Force constraints

Nucleotides and labels participate in repulsion and springs. Invisible geometric
hubs preserve loop and stem shape. These hubs are deliberate force constraints,
not fake nucleotides; they never appear in the SVG or biological index map.
Each hub records its members and `scaffoldType`, and each chord records its
owning `scaffoldUid`.

`freeTrailingEnds` removes exterior hubs and their constraints while retaining
real nucleotides and interior-loop constraints, including constraints that share
a nucleotide with an exterior loop. No synthetic closure nucleotide is needed.

Linear RRI and intramolecular options construct two-rail helix templates from
the validated pair structure. Projection preserves handedness, handles bulges
and interior loops, and respects fixed nodes. Index labels receive a bounded
outward adjustment. RRI horizontalization is a rigid graph rotation, and the
viewport refits once at force convergence.

## Drawing and lifecycle

The force graph is ordinary JavaScript data held by a core instance. Vue must
never wrap it in `ref()` or `reactive()`. SVG joins and force listeners are scoped
to the target element. The historical CSS class names remain compatible with
the existing stylesheet and annotation helpers.

Starting a replacement render cancels pending annotation work, detaches linear
layout listeners, stops the old force, disconnects its resize observer, and
removes drag/zoom handlers. A pending render resolves with `{ cancelled: true }`.
Different `createVaRRI()` instances keep separate colors, registries, roots, and
lifecycle state. Call `cancelActiveRender()` when removing a viewer.

Tests cover topology, finite force positions, fixed-node behavior, rail geometry,
label bias, cancellation, separate instances, and browser export.
