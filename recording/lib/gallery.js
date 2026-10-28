import fs from 'node:fs/promises';
import path from 'node:path';

const escape = value => String(value).replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export async function writeGallery(directory, clips) {
  const cards = clips.map(clip => `<article>
  <h2>${escape(clip.title)}</h2>
  <p class="meta">${clip.duration.toFixed(1)} seconds · ${(clip.bytes / 1024).toFixed(1)} KiB · ${clip.codec.toUpperCase()} · ${clip.fps} fps</p>
  <video controls muted playsinline preload="none" width="${clip.width}" height="${clip.height}"
    poster="${clip.id}.png" aria-label="${escape(clip.title)}" aria-describedby="${clip.id}-description">
    <source src="${clip.id}.webm" type='video/webm; codecs="${clip.codec}"'>
    <track kind="captions" src="${clip.id}.vtt" srclang="en" label="English">
    <a href="${clip.id}.webm">Download this demo</a>
  </video>
  <p id="${clip.id}-description">${escape(clip.description)}</p>
  <details><summary>Step-by-step transcript</summary><ol>${clip.cues.map(cue => `<li>${escape(cue.text)}</li>`).join('')}</ol></details>
  <p><a href="${clip.id}.webm" download>WebM</a> · <a href="${clip.id}.png" download>Poster</a> · <a href="${clip.id}.vtt" download>Captions</a></p>
</article>`).join('\n');
  await fs.writeFile(path.join(directory, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>vaRRI interaction demos</title><link rel="stylesheet" href="gallery.css"></head>
<body><main><h1>vaRRI interaction demos</h1>
<p>Short recordings of the real viewer. Press Play to watch a clip.</p>
${cards}
<p><a href="manifest.json">Generation and size report</a></p>
</main><script type="module" src="gallery-player.js"></script></body></html>\n`);
  for (const file of ['gallery.css', 'gallery-player.js']) {
    await fs.copyFile(path.join(import.meta.dirname, file), path.join(directory, file));
  }
}
