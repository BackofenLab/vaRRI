import assert from 'node:assert/strict';
import path from 'node:path';

const mappings = {
  selectMovedBtn: 'release-positions', releasePositionsBtn: 'release-positions',
  resetPositionsBtn: 'reset-positions', undoCanvasBtn: 'reset-positions',
};
const state = page => page.evaluate(async () => {
  const { default: viewer } = await import('/index.js');
  return JSON.stringify(viewer.state.canvasInteraction);
});
const fits = async popup => {
  const box = await popup.boundingBox(), size = popup.page().viewportSize();
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 1 &&
    box.y + box.height <= size.height + 1, 'The video guide stays inside the viewport');
};

export async function exercisePositionVideos(page, output) {
  const panel = page.locator('#viewControlsPanel');
  const toggle = page.locator('#viewControlsToggle');
  if (!await panel.isVisible()) await toggle.click();
  await page.waitForFunction(() => document.querySelectorAll('#viewControlsPanel [data-help-video-ready]').length === 4);
  assert.equal(await panel.locator('h3').textContent(), 'Manual positioning ?');
  assert.equal(await panel.getByRole('link', { name: 'Canvas interaction help' }).textContent(), '?');
  const initial = await state(page);
  let previous;
  for (const [id, clip] of Object.entries(mappings)) {
    const action = page.locator('#' + id);
    const icon = action.locator('..').locator('.video-help-icon');
    assert.equal(await icon.getAttribute('data-help-video'), clip);
    assert.equal(await action.getAttribute('data-help-preview'), null);
    assert.equal(await icon.isEnabled(), true, 'Guides remain available for disabled actions');
    const box = await action.boundingBox(), symbol = await icon.boundingBox();
    if (previous) assert.ok(box.y > previous.y && Math.abs(box.x - previous.x) < 1,
      'Manual positioning actions form one left-aligned column');
    previous = box;
    assert.ok(symbol.x >= box.x + box.width && Math.abs(symbol.y - box.y) < 8);
    const popup = page.locator('#' + await icon.getAttribute('aria-controls'));
    await action.hover();
    await page.waitForTimeout(350);
    assert.equal(await popup.isVisible(), false, 'Hovering the action does not open video help');
    await icon.hover();
    await popup.waitFor({ state: 'visible' });
    const video = popup.locator('video');
    await page.waitForFunction(video => !video.paused && video.currentTime > 0, await video.elementHandle());
    await popup.hover();
    await page.waitForTimeout(250);
    assert.equal(await popup.isVisible(), true, 'Moving into the player keeps it open');
    await fits(popup);
    const small = await video.boundingBox();
    await popup.locator('.help-video-enlarge').click();
    assert.ok((await video.boundingBox()).width > small.width, 'Clicking the video enlarges it');
    await fits(popup);
    await popup.getByRole('button', { name: 'Shrink video', exact: true }).click();
    const compact = await video.boundingBox();
    await video.click({ position: { x: compact.width / 2, y: compact.height - 16 } });
    assert.ok(Math.abs((await video.boundingBox()).width - small.width) < 1,
      'Using the native playback control strip does not enlarge the video');
    assert.equal(await popup.locator('details').evaluate(el => el.open), false,
      'The enlargement hint does not toggle the transcript');
    await popup.locator('summary').click({ position: { x: 30, y: 8 } });
    assert.equal(await popup.locator('details').evaluate(el => el.open), true);
    await popup.locator('summary').click({ position: { x: 30, y: 8 } });
    await page.keyboard.press('Escape');
    await popup.waitFor({ state: 'hidden' });
    await icon.focus();
    await icon.press('Enter');
    await popup.getByRole('button', { name: 'Enlarge video', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.ok((await video.boundingBox()).width > small.width, 'Keyboard users can enlarge the video');
    await page.keyboard.press('Escape');
    assert.equal(await icon.evaluate(el => el === document.activeElement), true);
    await icon.click();
    if (output && id === 'selectMovedBtn') await page.screenshot({ path: path.join(output, 'manual-position-video.png') });
    await toggle.click();
    await popup.waitFor({ state: 'hidden' });
    await page.waitForFunction(video => video.paused && video.currentTime === 0, await video.elementHandle());
    await toggle.click();
    assert.equal(await state(page), initial, 'Using video guides preserves manual positioning state');
  }
  if (output) await panel.screenshot({ path: path.join(output, 'manual-position-controls.png') });
  await page.mouse.move(0, 0);
  await responsiveGuides(page, output);
}

async function responsiveGuides(page, output) {
  const browser = page.context().browser();
  for (const [width, height, touch] of [[320, 640, true], [1000, 400, false]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch,
      reducedMotion: 'reduce', ...(touch && browser.browserType().name() === 'chromium' ? { isMobile: true } : {}) });
    try {
      const narrow = await context.newPage();
      const origin = new URL(page.url()).origin;
      await narrow.route('**/*', route => new URL(route.request().url()).origin === origin
        ? route.continue() : route.fulfill({ status: 200, body: '' }));
      await narrow.goto(page.url(), { waitUntil: 'networkidle' });
      const icon = narrow.locator('#undoCanvasBtn').locator('..').locator('.video-help-icon');
      await icon.scrollIntoViewIfNeeded();
      const popup = narrow.locator('#' + await icon.getAttribute('aria-controls'));
      if (touch) await icon.tap();
      else {
        await icon.hover();
        await popup.waitFor({ state: 'visible' });
        assert.equal(await popup.locator('video').evaluate(el => el.paused), true);
        await icon.click();
      }
      await popup.waitFor({ state: 'visible' });
      const hint = popup.getByRole('button', { name: 'Enlarge video', exact: true });
      if (touch) await hint.tap(); else await hint.click();
      await fits(popup);
      if (output) await narrow.screenshot({ path: path.join(output, `position-video-${width}x${height}.png`) });
      assert.equal(await popup.isVisible(), true);
      const close = popup.getByRole('button', { name: 'Close video guide' });
      if (touch) await close.tap(); else await close.click();
      await popup.waitFor({ state: 'hidden' });
    } finally { await context.close(); }
  }
}
