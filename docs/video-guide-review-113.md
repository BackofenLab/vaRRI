# Video guide review corrections

These changes address the [31 October review of PR #113](https://github.com/BackofenLab/vaRRI/pull/113#issuecomment-6548232593).

The play marks now contain an outlined triangle inside a circle. Manual
positioning has one left-aligned column of action buttons, each followed by an
independent video icon. The question-mark link beside the heading opens the
interaction help. Hovering an action button does not open a video; its icon uses
the same enterable, keyboard-accessible player as the left-panel guides.

The gray enlargement hint follows “Details and transcript”. The picture and
the hint both enlarge the player. The hint also works with the keyboard.
An independent picture target supports Firefox's native media controls, with
the control strip and its menus kept available. Enlarged videos fit short
viewports. Closing the drawer stops and rewinds its players.

## Recording provenance and inspection

All 19 scenes were regenerated from clean source
`f28d1159fb8ce74d4b0c17457c5921c439ebcda2`, using Chromium 153.0.8010.12 and the
Playwright FFmpeg VP8 encoder at 960 × 640, 15 fps, CRF 10. Subsequent changes to
the player’s native-menu safeguard do not affect recorded scenes, which disable
video-help enhancement during capture.

The recorder counts encoded frames after each completed gesture before showing
another instruction. Existing action holds count toward the minimum 0.5 seconds;
the instruction reading-time calculation is unchanged. Recording now rejects
timelines that violate this pause. Across the 82 instruction cards, the minimum
observed interval after a preceding action is 0.533 seconds.

Complete encoded playback passed in Chromium 153.0.8010.12 and Firefox 155.0.
Visual inspection covered every poster, instruction, completed action phase,
and final result: 183 samples across 24 contact sheets. No clipped instructions
or missing completed renders were found. The longest clip is 39.47 seconds;
the largest is 3284.8 KiB. The published catalog totals 29842.4 KiB including
posters and captions. Asset hashes and provenance pass catalog validation.

Generated media, playback reports, contact sheets, and UI screenshots remain
under ignored `output/playwright/`; only the reviewed catalog is committed.

## Regression checks

- 48 unit suites and 561 tests; architecture and installed-package checks.
- Native/standalone browser contracts, composed help and citation pages.
- Full Chromium and Firefox UI workflows, followed by focused video checks
  after the final native-menu safeguard.
- Separate action/icon behavior, pointer entry, keyboard enlargement and
  dismissal, native-control hit testing, unchanged manual state, drawer cleanup,
  reduced motion, touch, 320-pixel width, and a 400-pixel-high window.
- All five existing RNA visual fixtures pass; no baselines were updated.

## Independent review

A separate review agent checked the implementation, timing, catalog, targeted
tests, browser controls, and selected contact sheets. It found that player
enhancement replaced the Moved and Undo icons' contextual accessible names with
their shared clip titles. Enhancement now preserves supplied labels, and browser
regressions check all four names after setup. The reviewer verified that fix and
native caption selection in both browsers, with no remaining actionable findings.
