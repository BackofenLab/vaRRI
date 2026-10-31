import assert from 'node:assert/strict';
import path from 'node:path';

const guides = {
  'Sequence and structure input': ['choose-example', 'name-and-number-strand', 'import-fasta', 'store-load-session'],
  'Visualization settings': ['highlight-rri-nucleotides', 'linearize-rri-layout'],
  'Text annotations': ['place-text-annotation'],
  'Region highlights': ['highlight-rri-background', 'add-region-highlight'],
  'Subsequence highlights': ['add-subsequence-highlight'],
  'Point mutations': ['add-point-mutation'],
  'Probability profiles': ['apply-probability-profile'],
};

async function posterReady(video) {
  await video.evaluate(async element => {
    const image = new Image();
    image.src = element.poster;
    await image.decode();
    await new Promise(requestAnimationFrame);
  });
}

export async function exerciseLeftVideoGuides(page, output) {
  const initialSequence = await page.locator('#sequence').inputValue();
  const mediaRequests = [];
  const record = request => { if (/\.webm(?:\?|$)/.test(request.url())) mediaRequests.push(request.url()); };
  page.on('request', record);
  let first = true;
  try {
    for (const [name, clips] of Object.entries(guides)) {
      const panel = page.getByRole('complementary', { name, exact: true });
      const section = panel.locator('details.control-group');
      if (!await section.evaluate(element => element.open)) await section.locator(':scope > summary').click();
      const group = panel.locator('.panel-video-guides');
      assert.equal(await group.evaluate(element => element.open), false, `${name}: guides start compact`);
      await group.locator(':scope > summary').click();
      assert.equal(await group.locator('[data-help-demo]').count(), clips.length);
      for (const id of clips) {
        const target = group.locator(`[data-help-demo="${id}"]`);
        await page.waitForFunction(element => element.dataset.helpDemoReady === 'true', await target.elementHandle());
        const trigger = target.locator('.help-demo-trigger');
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        assert.ok((await trigger.innerText()).length > 10, `${id}: task name is visible on the button`);
        assert.equal(await target.locator('video').count(), 0, `${id}: media remains lazy`);
      }
      if (first) assert.equal(mediaRequests.length, 0, 'Opening the guide list does not request a video');
      const target = group.locator(`[data-help-demo="${clips[0]}"]`);
      const trigger = target.locator('.help-demo-trigger');
      await trigger.focus();
      await trigger.press('Enter');
      const video = target.locator('video');
      assert.equal(await video.isVisible(), true, 'Keyboard activation opens the controlled player');
      await posterReady(video);
      const videoBox = await video.boundingBox();
      const columnBox = await page.locator('.controls-column').boundingBox();
      assert.ok(videoBox.y >= columnBox.y - 1 && videoBox.y + videoBox.height <= columnBox.y + columnBox.height + 1,
        'Opening a guide scrolls its video clear of the sidebar clipping edges');
      assert.equal(await video.getAttribute('controls'), '');
      assert.equal(await video.getAttribute('autoplay'), null);
      assert.equal(await video.getAttribute('loop'), null);
      assert.equal(await video.evaluate(element => element.paused), true, 'Opening does not start playback');
      assert.ok(await target.locator('.help-demo-transcript li').count() > 0);
      await video.evaluate(element => element.play());
      await page.waitForFunction(element => element.currentTime > 0 && element.textTracks[0]?.cues?.length > 0,
        await video.elementHandle());
      if (first && output) await page.screenshot({ path: path.join(output, 'left-video-guides.png'), fullPage: true });

      await group.locator(':scope > summary').click();
      await page.waitForFunction(element => element.paused && element.currentTime === 0, await video.elementHandle());
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false', 'Closing guides collapses its players');
      await group.locator(':scope > summary').click();
      await trigger.click();
      await video.evaluate(element => element.play());
      await section.locator(':scope > summary').click();
      await page.waitForFunction(element => element.paused && element.currentTime === 0, await video.elementHandle());
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false', 'Closing the parent panel stops its player');
      first = false;
    }
    assert.equal(await page.locator('#sequence').inputValue(), initialSequence, 'Video help leaves the user input unchanged');

    // A touch-sized viewport retains explicit playback; no hover is required.
    const previous = page.viewportSize();
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      const panel = page.getByRole('complementary', { name: 'Point mutations', exact: true });
      await panel.locator('details.control-group > summary').click();
      const target = panel.locator('[data-help-demo="add-point-mutation"]');
      await target.locator('.help-demo-trigger').click();
      const video = target.locator('video');
      await posterReady(video);
      const box = await video.boundingBox();
      assert.ok(box.width > 200 && box.x >= 0 && box.x + box.width <= 390, 'The mobile player fits the viewport');
      assert.equal(await video.getAttribute('controls'), '');
      if (output) await page.screenshot({ path: path.join(output, 'left-video-guides-mobile.png'), fullPage: true });
      await target.locator('.help-demo-trigger').click();
    } finally { await page.setViewportSize(previous); }
  } finally {
    page.off('request', record);
    await page.locator('.panel-video-guides').evaluateAll(groups => groups.forEach(group => { group.open = false; }));
    const input = page.getByRole('complementary', { name: 'Sequence and structure input', exact: true })
      .locator('details.control-group');
    if (!await input.evaluate(element => element.open)) await input.locator(':scope > summary').click();
  }
}
