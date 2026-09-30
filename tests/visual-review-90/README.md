# Reviewed strand gaps and Fornac constraints

These fixtures record Martin's tasks 1–4 on PR #90. The exact implementation
revision, Chromium version, viewport, seed, and visible counts are recorded in
`manifest.json`. Both earlier fixture sets remain unchanged.

All five images were reviewed alongside `../visual-core`: the two virtual
strand-break vertices enlarge and separate the terminal loop; nucleotide,
link, annotation, mutation, profile, and biological label content is retained.
The [audit](../../docs/review-90-layout-audit.md) records the geometry review and
the independent Fornac constraint comparison. Force-loop sizes are separately
checked by `tests/force-geometry.test.js`.

`npm run test:visual` compares the native viewer to these active fixtures.
Recording requires an explicit `--update --revision FULL_SOURCE_COMMIT_SHA`
after geometry review; do not regenerate them to mask a test failure.
