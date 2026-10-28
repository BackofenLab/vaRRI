# Extending the vaRRI recorder

The repository's root AGENTS.md also applies. Read [README.md](README.md) first.
This directory contains development tools; generation needs no AI service.
It uses the parent repository's pinned npm dependencies and live viewer source.

## Where to work

- Add a demonstration in `scenes/<verb>-<subject>.js` and register its default
  export in `scenes/index.js`. Keep one user task per scene.
- Start from `scenes/move-selection.js` for selection/dragging or
  `scenes/reset-positions.js` for button interactions.
- Use `config.js` for shared viewport and input defaults. Prefer a scene's
  `parameters`, `stage`, or `zoom` override and `prepare(page)` hook for setup.
- Put reusable gestures in `lib/capture.js`; put shared assertions and locators
  in `scenes/helpers.js`. Keep scene-specific expectations inside that scene.
- Presentation belongs in `lib/stage.css` and the gallery files. Select an existing
  stage profile first; use `prepare(page)` for additional scene-specific framing.
- `record.js` owns recording and generated preview output. `publish.js` separately
  promotes reviewed assets into the served catalog. `lib/verify.js` checks encoded
  playback. Preserve their checks when extending the recorder.

## Scene contract

Export `{ id, title, description, placements, parameters?, stage?, zoom?, prepare?,
async run(capture, page) }`. Use unique lowercase hyphenated IDs; they become output
filenames. `placements` is a required nonempty array describing intended help
locations, such as `docs:additional-features`; it does not create UI anchors.
Add a matching `data-help-demo` anchor beside written instructions when integrating
a new scene, and republish the complete catalog after review.

`parameters` contains existing vaRRI URL fields. `stage` is `canvas` (default),
`full-ui`, `dialog`, or `export-dialog`; `zoom: false` disables setup wheel zoom.
`prepare(page)` runs after common framing, readiness, and zoom and before the
poster/capture; use it for unrecorded, scene-specific setup. All visible
demonstrated actions belong in `run`, using capture helpers documented in README.

Exercise real keyboard and pointer events. Do not assign graph coordinates,
selected flags, or artificial outlines to make an interaction appear successful.
Read state/geometry for assertions, and make a broken feature fail the recording.
The `node(page, index)` helper uses zero-based DOM order, not biological indices.
Release held keys and mouse buttons. Wait for renders/dialogs after UI changes.

Every scene should begin with an instruction, allow reading time, show one short
task, assert its observable result, and hold the final state. Stay within the
20-second and 512-KiB defaults unless the task explicitly needs different limits.
At least one nonempty, single-line caption is required. Capture frames between
caption changes so their start times increase; the same cues form the transcript.
`capture.hold()` repeats a still frame; it cannot demonstrate running physics.
Do not call the output byte-identical across browser, font, or encoder versions.

## Verify changes

From the repository root:

```bash
npm run demos -- --list
npm run demos -- --only YOUR-SCENE-ID
npm run demos:preview
npm run test:architecture
```

Watch the complete clip and inspect its poster and decoded `-review.png`.
Check labels, pointer alignment, captions, size, and the asserted behavior.
If changing shared capture, fixture, framing, or encoding code, run `npm run demos`
for all scenes. Root PR CI also runs all scenes. Follow the root instructions
for the other required pre-PR checks; do not overwrite visual baselines.

Generated previews stay under the ignored `output/playwright/` tree. Published
help assets live in tracked `doc/demos/`; update them only when publication is in
scope. Include source, documentation, and workflow changes in the PR. Manually
review the complete catalog before `npm run demos:publish`: checksum and source
revision validation cannot attest that human review occurred. Record which scenes
and encoders were verified, and run `npm run demos:check-published` after promotion.
