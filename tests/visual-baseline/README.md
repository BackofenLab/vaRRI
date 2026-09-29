# Browser regression baseline

These generated PNG and SVG scene snapshots were captured from revision
`4cc97df477f981d582e8f15c3cd430b813d0e608`, before the issue #83 migration.
`manifest.json` records the browser, viewport, random seed, and fixture counts.
All five existing examples are covered, including profiles, mutations, cropping,
signed offsets, and crossing interactions. Force and linear-layout switches are
disabled to make the coordinate comparison deterministic. Force behavior still
requires separate model and browser assertions.

Install the development dependencies, then a Playwright browser:

```sh
npm ci
npx playwright install chromium
npm run test:visual
```

An existing Chromium executable can be selected with `VARRI_BROWSER_PATH`.
The runner serves the checkout over HTTP, imports the actual browser entry point,
and compares the canvas screenshot and SVG coordinates, colors, labels, and
annotation counts. External branding and the Markdown CDN are replaced with empty
responses so those services cannot change the canvas result. Failed comparisons
leave actual PNG and JSON artifacts in `output/playwright/` for inspection.

PNG comparison allows 0.2% changed pixels with a per-channel threshold of 24 to
accommodate minor antialiasing differences. SVG scene comparison is exact.

To deliberately record a reviewed baseline, export that revision into a separate
directory and run:

```sh
node scripts/visual-baseline.cjs --update --root /tmp/varri-original --revision FULL_COMMIT_SHA
```

Do not update these fixtures merely to silence a regression. Record why any
deliberate visual change is acceptable in `MIGRATION_PROTOCOL.md`, and review
the before and after screenshots. PNG/JSON files here are generated fixtures;
the source file size policy applies to the runner and this documentation.
