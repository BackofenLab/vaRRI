# Independent core rendering baseline

The phase-2 screenshots were reviewed beside the five original fixtures in
`../visual-baseline/`. All biological content, strand colors, annotation counts,
mutation labels and profile overlays remain present. Removing the artificial
three-nucleotide strand gap changes the initial polygon geometry and fitting;
those deliberate differences are accepted here. The original fixtures remain
unchanged for historical comparison.

`manifest.json` identifies the exact source commit and browser used to capture
these generated PNG and JSON files. The `nucleotides` count in the historical
snapshot format includes overlay circles. `tests/graph-topology.test.js` and
`scripts/browser-invariants.cjs` separately verify the exact number of real
nucleotides, contiguous IDs, unique base pairs, and absent cross-strand backbone.

Run `npm run test:visual` after `npm ci` and `npx playwright install chromium`.
Set `VARRI_BROWSER_PATH` to select an installed Chromium executable. Failed
comparisons leave current screenshots and SVG scene JSON in `output/playwright`.
The visual runner uses seeded randomness and animation disabled, and checks the
actual ESM entry point. Force layout, instance isolation, cancellation, export,
and source/bundle parity are checked separately by `npm run test:browser`.

Record new fixtures only after reviewing a deliberate rendering change, using
`node scripts/visual-baseline.cjs --update --revision FULL_SOURCE_COMMIT_SHA`.
See `MIGRATION_PROTOCOL.md` for the migration's review gates and provenance.
