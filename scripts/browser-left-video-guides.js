import assert from 'node:assert/strict';
import path from 'node:path';

const guides = {
  'Sequence and structure input': {
    'choose-example': '#exampleDropdownLabel', 'name-and-number-strand': '.sequence-names legend',
    'import-fasta': '#fastaInputBtn', 'store-load-session': '#loadJsonBtn',
  },
  'Visualization settings': {
    'highlight-rri-nucleotides': 'label[for="highlighting"]',
    'linearize-rri-layout': 'label[for="forceLayoutLinearRRI"]',
  },
  'Text annotations': { 'place-text-annotation': '#textAnnotationSubmitBtn' },
  'Region highlights': {
    'highlight-rri-background': 'label[for="backgroundhighlighting"]', 'add-region-highlight': '#regionSubmitBtn',
  },
  'Subsequence highlights': { 'add-subsequence-highlight': '#highlightSubmitBtn' },
  'Point mutations': { 'add-point-mutation': '#mutationSubmitBtn' },
  'Probability profiles': { 'apply-probability-profile': '#profileApplyBtn' },
};

const popupFor = async target => target.page().locator('#' + await target.getAttribute('aria-controls'));
const fieldValues = page => page.locator('.controls-column input, .controls-column textarea, .controls-column select')
  .evaluateAll(fields => fields.map(field => [field.id, field.value, field.checked ?? null]));
const playing = async video => video.page().waitForFunction(element => !element.paused && element.currentTime > 0 &&
  element.textTracks[0]?.cues?.length > 0, await video.elementHandle());

async function stopped(video) {
  await video.page().waitForFunction(element => element.paused && element.currentTime === 0, await video.elementHandle());
}

async function fits(popup) {
  const box = await popup.boundingBox(), viewport = popup.page().viewportSize();
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 &&
    box.y + box.height <= viewport.height + 1, 'The entire video popup fits the viewport');
}

async function touchVideo(page, output) {
  const browser = page.context().browser();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true,
    ...(browser.browserType().name() === 'chromium' ? { isMobile: true } : {}) });
  try {
    const touch = await context.newPage();
    const origin = new URL(page.url()).origin;
    await touch.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.fulfill({ status: 200, body: '' }));
    await touch.goto(page.url(), { waitUntil: 'networkidle' });
    const initial = await fieldValues(touch);
    const panel = touch.getByRole('complementary', { name: 'Point mutations', exact: true });
    await panel.locator('details.control-group > summary').tap();
    const target = panel.locator('[data-help-video="add-point-mutation"]');
    await target.tap();
    const popup = await popupFor(target), video = popup.locator('video');
    await playing(video);
    await fits(popup);
    assert.equal(await video.getAttribute('controls'), '');
    assert.equal(await touch.locator('#mutationDialog').isVisible(), false, 'Tapping help does not add a mutation');
    if (output) await touch.screenshot({ path: path.join(output, 'left-video-guides-mobile.png'), fullPage: true });
    await popup.getByRole('button', { name: 'Close video guide' }).tap();
    await stopped(video);
    assert.deepEqual(await fieldValues(touch), initial);
  } finally { await context.close(); }
}

export async function exerciseLeftVideoGuides(page, output) {
  const initial = await fieldValues(page);
  const mediaRequests = [];
  const record = request => { if (/\.webm(?:\?|$)/.test(request.url())) mediaRequests.push(request.url()); };
  page.on('request', record);
  let first = true;
  try {
    await page.waitForFunction(() => document.querySelectorAll('[data-help-video-ready]').length === 12);
    assert.equal(await page.locator('.panel-video-guides').count(), 0, 'Icons replace the separate guide lists');
    for (const [name, clips] of Object.entries(guides)) {
      const panel = page.getByRole('complementary', { name, exact: true });
      const section = panel.locator('details.control-group');
      if (!await section.evaluate(element => element.open)) await section.locator(':scope > summary').click();
      assert.equal(await panel.locator('[data-help-video]').count(), Object.keys(clips).length);
      for (const [id, selector] of Object.entries(clips)) {
        const target = panel.locator(`[data-help-video="${id}"]`);
        const popup = await popupFor(target);
        await target.scrollIntoViewIfNeeded();
        const iconBox = await target.boundingBox();
        const controlBox = await panel.locator(selector).last().boundingBox();
        assert.ok(iconBox.width <= 32 && iconBox.height <= 32, `${id}: a compact video icon`);
        assert.ok(Math.abs(iconBox.y - controlBox.y) < 40, `${id}: icon accompanies the matching control`);
        assert.equal(await popup.locator('video').count(), 0, `${id}: video is created only on demand`);
        assert.match(await target.getAttribute('aria-label'), /^Video guide: /);
        if (first) assert.equal(mediaRequests.length, 0, 'No WebM loads before a video icon is used');

        await target.hover();
        await popup.waitFor({ state: 'visible' });
        const video = popup.locator('video');
        await playing(video);
        assert.ok(new URL(await video.locator('source').getAttribute('src')).pathname.endsWith(`/${id}.webm`),
          `${id}: the icon plays its corresponding video`);
        assert.equal(await video.evaluate(element => element.muted && element.playsInline), true);
        assert.equal(await video.getAttribute('controls'), '');
        assert.equal(await video.evaluate(element => element.textTracks[0].mode), 'hidden',
          'Compact previews do not duplicate the centered instruction card');
        assert.equal(await video.evaluate(element => element.textTracks[0].cues[0].line), 0,
          'Optional captions stay above the centered instruction card');
        if (first) {
          await video.evaluate(element => { element.textTracks[0].mode = 'showing'; });
          assert.equal(await video.evaluate(element => element.textTracks[0].mode), 'showing');
          await video.evaluate(element => { element.textTracks[0].mode = 'hidden'; });
        }
        await fits(popup);
        await popup.hover();
        assert.equal(await popup.isVisible(), true, 'The pointer can enter the preview and use its controls');
        await page.mouse.move(0, 0);
        await popup.waitFor({ state: 'hidden' });
        await stopped(video);

        await target.focus();
        await playing(video);
        await target.press('Tab');
        assert.equal(await popup.getByRole('button', { name: 'Close video guide' })
          .evaluate(element => element === document.activeElement), true, 'Keyboard users can enter the popup');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await target.evaluate(element => element === document.activeElement), true,
          'Reverse tab returns from the popup to its icon');
        await target.press('Tab');
        await page.keyboard.press('Escape');
        await popup.waitFor({ state: 'hidden' });
        assert.equal(await target.evaluate(element => element === document.activeElement), true);

        await target.click();
        await playing(video);
        await page.mouse.move(0, 0);
        assert.equal(await popup.isVisible(), true, 'Click keeps the preview open');
        assert.ok(await popup.locator('.help-demo-transcript li').count() > 0);
        assert.ok((await popup.locator('a[download]').getAttribute('download')).endsWith(`${id}.webm`));
        if (first && output) await page.screenshot({ path: path.join(output, 'left-video-guides.png'), fullPage: true });
        await popup.getByRole('button', { name: 'Close video guide' }).click();
        await stopped(video);
        assert.deepEqual(await fieldValues(page), initial, `${id}: video help does not change form values`);
        assert.equal(await page.locator('dialog[open]').count(), 0, 'Video buttons do not trigger form dialogs');
        first = false;
      }
      const target = panel.locator('[data-help-video]').first();
      await target.click();
      const popup = await popupFor(target), video = popup.locator('video');
      await section.locator(':scope > summary').click();
      await popup.waitFor({ state: 'hidden' });
      await stopped(video);
    }

    const input = page.getByRole('complementary', { name: 'Sequence and structure input', exact: true });
    await input.locator('details.control-group > summary').click();
    const target = input.locator('[data-help-video="choose-example"]');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await target.hover();
    const popup = await popupFor(target), video = popup.locator('video');
    await popup.waitFor({ state: 'visible' });
    assert.equal(await video.evaluate(element => element.paused), true, 'Reduced motion suppresses automatic playback');
    await target.click();
    await playing(video);
    await popup.getByRole('button', { name: 'Close video guide' }).click();
    await touchVideo(page, output);
  } finally {
    page.off('request', record);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.mouse.move(0, 0);
    await page.locator('#sequence').focus();
  }
}
