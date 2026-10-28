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
  `parameters` override or `prepare(page)` hook for scene-specific setup.
- Put reusable gestures in `lib/capture.js`; put shared assertions and locators
  in `scenes/helpers.js`. Keep scene-specific expectations inside that scene.
- Presentation belongs in `lib/stage.css` and the gallery files. Change framing
  with a scene's `prepare(page)` hook when only that scene needs different UI.
- `record.js` owns orchestration and output publication. `lib/verify.js` checks
  encoded playback. Preserve their checks when extending the recorder.

## Scene contract

Export `{ id, title, description, parameters?, prepare?, async run(capture, page) }`.
Use unique lowercase hyphenated IDs; they become output filenames. `parameters`
contains existing vaRRI URL fields. `prepare(page)` runs after the common canvas
setup and before the poster/capture; use it for unrecorded, scene-specific setup.
All visible demonstrated actions belong in `run`, using capture helpers.

Exercise real keyboard and pointer events. Do not assign graph coordinates,
selected flags, or artificial outlines to make an interaction appear successful.
Read state/geometry for assertions, and make a broken feature fail the recording.
The `node(page, index)` helper uses zero-based DOM order, not biological indices.
Release held keys and mouse buttons. Wait for renders/dialogs after UI changes.

Every scene should begin with an instruction, allow reading time, show one short
task, assert its observable result, and hold the final state. Stay within the
20-second and 512-KiB defaults unless the task explicitly needs different limits.
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

Generated media stays under the ignored `output/playwright/` tree. Include
source, documentation, and workflow changes in the PR. Publish or embed selected
media only when requested. Record which scenes and encoders were verified.
