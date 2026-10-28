import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { root, viewport, serve, findEncoder } from './lib/runtime.js';
import { prepareStage, Capture, writeCaptions } from './lib/capture.js';
import { scenes } from './scenes/index.js';
import { writeGallery } from './lib/gallery.js';
import { verifyVideos } from './lib/verify.js';

const help = `Generate short, verified vaRRI WebM demos.

npm run demos -- [--only select-nodes] [--out output/playwright/demos]
  --list           List scene IDs without opening a browser
  --only ID        Record one scene instead of all scenes
  --fps NUMBER     Frames per second (default 15, range 10–30)
  --crf NUMBER     Compression strength (default VP9: 32, VP8: 10; range 4–50)
  --max-kib NUMBER Fail if any video exceeds this size (default 512 KiB)
  --headed         Show Chromium while recording
  --help           Show this help

Optional environment: FFMPEG_PATH, VARRI_BROWSER_PATH.
Output: WebM, PNG poster, VTT, HTML preview, manifest, final-frame review PNG.
`;

function number(value, fallback, min, max, name) {
  const result = Number(value ?? fallback);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return result;
}

async function main() {
  const { values } = parseArgs({ options: {
    list: { type: 'boolean' }, only: { type: 'string' }, out: { type: 'string' },
    fps: { type: 'string' }, crf: { type: 'string' }, 'max-kib': { type: 'string' },
    headed: { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (values.help) { console.log(help); return; }
  if (values.list) { scenes.forEach(scene => console.log(`${scene.id}: ${scene.title}`)); return; }
  const chosen = values.only ? scenes.filter(scene => scene.id === values.only) : scenes;
  if (!chosen.length) throw new Error(`Unknown scene: ${values.only}. Use --list.`);
  const encoder = await findEncoder();
  const options = { fps: number(values.fps, 15, 10, 30, '--fps'),
    crf: number(values.crf, encoder.codec === 'vp9' ? 32 : 10, 4, 50, '--crf'),
    maxBytes: number(values['max-kib'], 512, 1, 10240, '--max-kib') * 1024 };
  const output = path.resolve(root, values.out || 'output/playwright/demos');
  console.log(`Encoder: ${encoder.codec.toUpperCase()} (${encoder.executable})`);
  const scratch = path.join(root, 'output/playwright');
  await fs.mkdir(scratch, { recursive: true });
  const staging = await fs.mkdtemp(path.join(scratch, 'demo-build-'));
  const server = await serve(root);
  let browser;
  const clips = [];
  try {
    browser = await chromium.launch({ headless: !values.headed,
      ...(process.env.VARRI_BROWSER_PATH ? { executablePath: process.env.VARRI_BROWSER_PATH } : {}) });
    for (const scene of chosen) {
      console.log(`Recording ${scene.id}…`);
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1,
        locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.url().startsWith(server.origin) && response.status() >= 400) errors.push(response.url());
      });
      await context.route('**/*', route => new URL(route.request().url()).origin === server.origin
        ? route.continue() : route.abort());
      await page.addInitScript(() => {
        let seed = 12345;
        Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      });
      let capture;
      try {
        await prepareStage(page, server.origin, scene);
        if (scene.prepare) await scene.prepare(page);
        const file = path.join(staging, `${scene.id}.webm`);
        capture = new Capture(page, encoder, options, file);
        await capture.caption(scene.title);
        await page.screenshot({ path: path.join(staging, `${scene.id}.png`) });
        // The first recorded instruction starts at zero; the poster has the title.
        capture.cues = [];
        await scene.run(capture, page);
        const duration = await capture.finish();
        if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
        const content = await fs.readFile(file);
        if (content.length > options.maxBytes) {
          throw new Error(`${scene.id}: ${(content.length / 1024).toFixed(1)} KiB exceeds ${options.maxBytes / 1024} KiB. Increase --crf, shorten the scene, or explicitly raise --max-kib.`);
        }
        await writeCaptions(path.join(staging, `${scene.id}.vtt`), capture.cues, duration);
        clips.push({ id: scene.id, title: scene.title, description: scene.description,
          file: `${scene.id}.webm`, poster: `${scene.id}.png`, captions: `${scene.id}.vtt`,
          ...viewport, duration, bytes: content.length, codec: encoder.codec,
          fps: options.fps, crf: options.crf, sha256: createHash('sha256').update(content).digest('hex'),
          cues: capture.cues });
        console.log(`  ${duration.toFixed(1)} s, ${(content.length / 1024).toFixed(1)} KiB`);
      } catch (error) {
        await page.screenshot({ path: path.join(staging, `${scene.id}-failure.png`) }).catch(() => {});
        if (capture) await capture.abort();
        throw error;
      } finally { await context.close(); }
    }
    await writeGallery(staging, clips);
    await verifyVideos(browser, staging, clips);
    const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
    await fs.writeFile(path.join(staging, 'manifest.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), revision: revision.status === 0 ? revision.stdout.trim() : null,
      dirty: status.status === 0 ? Boolean(status.stdout.trim()) : null,
      sizeBudgetBytes: options.maxBytes, clips,
    }, null, 2) + '\n');
    await fs.mkdir(output, { recursive: true });
    for (const file of await fs.readdir(staging)) await fs.copyFile(path.join(staging, file), path.join(output, file));
    await fs.rm(staging, { recursive: true });
    console.log(`Ready: ${path.join(output, 'index.html')}`);
  } catch (error) {
    console.error(`Diagnostic files: ${staging}`);
    throw error;
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
