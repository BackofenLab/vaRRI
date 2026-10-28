# Recording pipeline

The demo pipeline drives the real vaRRI viewer with Playwright and sends rendered
frames to FFmpeg. A scene describes a user task, shows a pointer and instructions,
and checks the result. Rerun scenes after changing the interface to refresh the
videos. No production JavaScript dependency or application build is added.

Generation is ordinary JavaScript, Playwright, and FFmpeg: no AI model, account,
or API key is used. This folder holds the recorder, scenes, presentation assets,
and explanation together. It uses the parent vaRRI checkout and its pinned
development dependencies; it is not an independent npm package.

Agents extending the recorder should start with [AGENTS.md](AGENTS.md).

## Folder map

| File | Responsibility |
| --- | --- |
| `record.js` | CLI, scene execution, size checks, manifest, verified output |
| `preview.js` | Local gallery server |
| `config.js` | Shared viewport and RNA input defaults |
| `scenes/index.js` | Scene registration and metadata validation |
| `scenes/*.js` | One demo per file, plus shared locators/assertions |
| `lib/capture.js` | Viewer setup, actual gestures, screenshot timing, encoding |
| `lib/runtime.js` | Repository location, encoder discovery, local HTTP server |
| `lib/stage.css` | Canvas framing and pointer/caption styling |
| `lib/gallery*` | Preview HTML, styling, and accessible playback behavior |
| `lib/verify.js` | Browser playback and decoded-frame checks |

`../package.json` exposes the npm commands. `../.github/workflows/demos.yml`
provides manual artifact generation; the existing PR workflow also runs the demos.

## Generate and preview

From the repository root, with Node.js 24:

```bash
npm ci
npx playwright install --with-deps chromium
npm run demos
npm run demos:preview
```

From inside this folder, `node record.js` and `node preview.js` also work.
All relative `--out` and preview paths are resolved against the repository root,
independently of the shell's current working directory.

Open the local URL printed by the preview command. Generated files are in
`output/playwright/demos/`, which is ignored by Git. The recorder starts and stops
its own loopback HTTP servers and browser; an already running viewer is unnecessary.

A full FFmpeg installation with `libvpx-vp9` is preferred (on Ubuntu/Debian:
`sudo apt-get install ffmpeg`; on macOS with Homebrew: `brew install ffmpeg`).
If it is absent, the pipeline automatically finds the FFmpeg bundled with the
installed Playwright browser. Depending on the pinned Playwright version, this
may produce VP8 WebM instead. Both are supported; the actual codec is reported.
Set `FFMPEG_PATH` to choose an executable explicitly. Set `VARRI_BROWSER_PATH` for
a custom Chromium executable. Binaries are never downloaded by the recorder.

```bash
npm run demos -- --list
npm run demos -- --only move-selection
npm run demos -- --fps 20 --crf 32 --max-kib 350
npm run demos -- --out output/playwright/review-demos --headed
npm run demos:preview -- output/playwright/review-demos
```

Each invocation generates a gallery and manifest for exactly the selected scenes.
Existing unrelated files in the output directory are left in place. A failed
recording, size check, or playback check leaves diagnostic files in a temporary
`output/playwright/demo-build-*` directory and does not replace the last successful
output. Successful runs remove their temporary files.

## Included scenes and deliverables

| Scene ID | Task |
| --- | --- |
| `select-nodes` | Add and remove nodes with Ctrl/Command-click |
| `move-selection` | Select two nodes, drag them together, keep their new positions |
| `reset-positions` | Move a node, select Moved, Reset, then Undo |

For each scene the output contains:

- `.webm`: silent video, 960 × 640, 15 fps by default.
- `.png`: full-size poster, generated before the first action.
- `.vtt`: optional timed English captions; instructions also appear in the video.
- `-review.png`: the last decoded video frame for visual review.

`index.html`, `gallery.css`, and `gallery-player.js` provide the preview.
`manifest.json` records duration, exact byte count, frame size, codec, quality,
frame rate, captions, SHA-256, source revision, and whether the checkout was dirty.
PNG review frames are QA artifacts; they do not need to be deployed.

## Quality and verification

The default video budget is 512 KiB per clip and the duration limit is 20 seconds.
Exceeding either fails the build. Defaults favor readable labels: VP9 uses CRF 32
and constant quality; the VP8 fallback uses CRF 10 with a 1 Mbit/s target.
CRF scales differ between codecs. Higher CRF generally reduces file size at the
expense of clarity. Prefer shorter scenes before substantially increasing CRF.

The pipeline checks selection counts, group displacement, stationary unselected
nodes, and reset/undo positions. Chromium then decodes every exported video from
start to finish, checks its dimensions and duration, and captures its final frame.
The preview is checked with reduced motion enabled. Visually review the clips
before embedding, particularly after changes to layout, controls, or fonts.

Recording uses a fixed viewport, seeded randomness, and static layout. It captures
one frame for each pointer step and repeats frames for instructional pauses. This
avoids loading screens and gives explicit output timing even on slower machines.
It is designed for discrete interactions, not real-time force-layout animation.
`capture.hold()` repeats a still frame; it does not record ongoing physics. Use a
separate real-time recording approach if a future scene needs to show convergence.
Fonts and browser/platform differences can still change pixels and encoded bytes.

## Add a scene

Create `recording/scenes/move-one-node.js` using the complete example below.
Each scene exports a unique filename-safe `id`, `title`, `description`, optional
URL `parameters`, optional `prepare(page)`, and `async run(capture, page)`.
Use lowercase hyphenated IDs such as `move-one-node`.

```javascript
import assert from 'node:assert/strict';

export default {
  id: 'move-one-node',
  title: 'Move one node',
  description: 'Drag an individual nucleotide to reposition it.',
  async run(capture, page) {
    const target = page.locator('#rendering-canvas circle[node_type="nucleotide"]').nth(3);
    const before = await target.boundingBox();
    await capture.caption('Drag a nucleotide to reposition it');
    await capture.hold(1);
    await capture.drag(target, -90, -70);
    const after = await target.boundingBox();
    assert.ok(Math.abs(after.x - before.x + 90) < 1);
    assert.ok(Math.abs(after.y - before.y + 70) < 1);
    await capture.hold(1.5);
  },
};
```

Import this module in `scenes/index.js` and append it to the exported `scenes`
array. Run `npm run demos -- --only move-one-node`, watch the preview, and inspect
the decoded final frame. Run all scenes when shared helpers or framing change.

Use real mouse/keyboard events for demonstrated actions and assertions for their
results. Do not assign node positions or fake selection classes.
`capture.click(locator, 'Control')`
shows a modifier-click; omit the modifier for a regular click.
`capture.move({x, y}, seconds)` moves the visible pointer and actual mouse together.
`capture.caption(text)` updates the instruction and the transcript/VTT timeline.

The fixture and viewport are in `config.js`; readiness checks, zoom, and the
recording overlay are in `lib/capture.js`. Override the fixture for one scene with
`parameters: { sequence: '...', structure: '...' }`. The common readiness check
expects an explicitly supplied sequence and counts its real nucleotides.

The framing is isolated in `lib/stage.css`: it shows the actual canvas and manual
position controls with an instruction band above. For demos of input panels,
use `async prepare(page)` to adjust framing with `page.addStyleTag()` and prepare
the desired controls before capture. If changing the shared framing, review all
scenes. When an action rerenders the viewer, wait for its new state before the next
frame. Instructions and visible gestures belong in `run`, after setup finishes.

| Capture helper | Effect |
| --- | --- |
| `caption(text)` | Set the visible instruction and begin a timed caption |
| `hold(seconds)` | Repeat the current frame for a reading pause |
| `move({ x, y }, seconds?)` | Move actual mouse and visible pointer together |
| `click(locator, modifier?)` | Approach and click; optionally hold `Control`/`Meta` |
| `drag(locator, dx, dy)` | Approach, press, drag by screen pixels, release |

For a new gesture, keep pointer feedback and frame capture together in a new
`Capture` method; a bare `page.click()` in a scene would omit its visible movement.
Waits for a render finish are separate from `hold()` and do not add video time.

## Embed in the interface or help

Copy the selected `.webm`, poster `.png`, and `.vtt` files into a served directory
such as `doc/demos/`. Retain useful explanatory text beside each video:

```html
<figure>
  <video controls muted playsinline preload="none" width="960" height="640"
    poster="doc/demos/move-selection.png" aria-describedby="move-demo-description">
    <source src="doc/demos/move-selection.webm" type="video/webm">
    <track kind="captions" src="doc/demos/move-selection.vtt" srclang="en" label="English">
    <a href="doc/demos/move-selection.webm">Download the movement demo</a>
  </video>
  <figcaption id="move-demo-description">
    Ctrl/Command-click nodes to select them, then drag a selected node to move the group.
  </figcaption>
</figure>
```

Style the video with `max-width: 100%; height: auto`. `preload="none"` defers video
downloads until requested; the poster supplies the initial image. Native controls
allow pausing, replaying, and keyboard access. The generated gallery starts only
on request, pauses other clips when a new one starts, and disables looping for
`prefers-reduced-motion`. Copy its player module if the embedded videos should
share that behavior. Avoid automatically playing several help videos at once.

The pipeline does not modify the live viewer or deploy assets. Embedding is a
separate editorial step after reviewing the generated clips. For browsers outside
your WebM support targets, an additional MP4 source can be supplied.

## GitHub Actions

The **Generate interaction demos** workflow is manually triggered with
`workflow_dispatch`. It installs Chromium and a VP9-capable FFmpeg, runs the same
pipeline, and uploads previews and diagnostics as an artifact retained for 14
days. It does not commit generated media, deploy Pages, or publish a release.
Select the branch containing the desired viewer changes when triggering it.

References: [Playwright screenshots](https://playwright.dev/docs/screenshots),
[Google's VP9 encoding guidance](https://developers.google.com/media/vp9/settings/vod).
