import assert from 'node:assert/strict';
import path from 'node:path';
import { serve, viewport } from './runtime.js';

/** Decode each delivered file in Chromium, including its last frame. */
export async function verifyVideos(browser, directory, clips) {
  const server = await serve(directory);
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(server.origin);
    for (const clip of clips) {
      const video = page.locator('video').filter({ has: page.locator(`source[src="${clip.id}.webm"]`) });
      const metadata = await video.evaluate(async element => {
        element.preload = 'auto';
        element.load();
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video metadata timed out')), 10000);
          element.addEventListener('loadedmetadata', () => { clearTimeout(timeout); resolve(); }, { once: true });
          element.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Video could not load')); }, { once: true });
        });
        return { width: element.videoWidth, height: element.videoHeight, duration: element.duration, loop: element.loop };
      });
      assert.equal(metadata.width, clip.width);
      assert.equal(metadata.height, clip.height);
      assert.ok(Math.abs(metadata.duration - clip.duration) < 0.15, `${clip.id}: incorrect encoded duration`);
      assert.equal(metadata.loop, false, 'Reduced motion disables looping');
      await video.evaluate(async element => {
        element.playbackRate = 4;
        await element.play();
      });
      await page.waitForFunction(id => {
        const element = document.querySelector(`source[src="${id}.webm"]`).parentElement;
        if (element.error) throw new Error(element.error.message);
        return element.ended;
      }, clip.id, { timeout: 15000 });
      await video.evaluate((element, width) => {
        element.controls = false;
        element.style.width = `${width}px`;
        element.style.maxWidth = 'none';
      }, clip.width);
      await video.screenshot({ path: path.join(directory, `${clip.id}-review.png`) });
      console.log(`  Verified playback: ${clip.id}`);
    }
    assert.deepEqual(errors, [], 'Preview page has no JavaScript errors');
  } finally {
    await context.close();
    await server.close();
  }
}
