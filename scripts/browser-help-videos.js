import assert from 'node:assert/strict';

async function visibleTeaser(target) {
  const teaser = target.locator('.help-demo-teaser');
  await teaser.waitFor({ state: 'visible' });
  await target.page().waitForFunction(element => {
    const image = element.querySelector('img');
    return image.complete && image.naturalWidth > 0;
  }, await teaser.elementHandle());
  return teaser;
}

async function assertPreviewFits(teaser, dialog) {
  const preview = await teaser.boundingBox();
  const bounds = dialog ? await dialog.boundingBox() :
    { x: 0, y: 0, ...teaser.page().viewportSize() };
  assert.ok(preview.x >= bounds.x && preview.y >= bounds.y &&
    preview.x + preview.width <= bounds.x + bounds.width &&
    preview.y + preview.height <= bounds.y + bounds.height,
  'The entire preview remains inside its visible viewport');
}

export async function exerciseDocsHelpVideos(page) {
  const catalog = await page.evaluate(async () => (await fetch('doc/demos/manifest.json')).json());
  const headingForPlacement = {
    'fasta-input': 'fasta-sequence-and-structure-input',
    'saved-session': 'load-a-saved-session',
    'json-session': 'json-session-files',
  };
  for (const clip of catalog.clips) {
    const demos = page.locator(`[data-help-demo="${clip.id}"]`);
    assert.ok(await demos.count() >= 1, `Documentation includes ${clip.id}`);
    for (const demo of await demos.all()) {
      assert.equal(await demo.getAttribute('data-help-demo-ready'), 'true');
      assert.ok((await demo.locator('button').getAttribute('aria-label')).includes(clip.title),
        'Each demonstration has a task-specific accessible name');
    }
    for (const placement of clip.placements.filter(value => value.startsWith('docs:'))) {
      const name = placement.slice(5);
      const anchorId = headingForPlacement[name] || name;
      const appearsInSection = await page.evaluate(({ anchorId, id }) => {
        const heading = document.getElementById(anchorId);
        if (!heading) return false;
        const selector = `[data-help-demo="${id}"]`;
        for (let sibling = heading.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
          if (/^H[1-6]$/.test(sibling.tagName) && sibling.tagName <= heading.tagName) break;
          if (sibling.matches(selector) || sibling.querySelector(selector)) return true;
        }
        return false;
      }, { anchorId, id: clip.id });
      assert.equal(appearsInSection, true, `The ${clip.id} demo accompanies its ${placement} instructions`);
    }
  }

  const move = page.locator('[data-help-demo="move-selection"]').first();
  const trigger = move.locator('button');
  await trigger.focus();
  const teaser = await visibleTeaser(move);
  await assertPreviewFits(teaser);
  await page.keyboard.press('Escape');
  await teaser.waitFor({ state: 'hidden' });
  assert.equal(await trigger.evaluate(element => element === document.activeElement), true,
    'Escape dismisses a preview without moving keyboard focus');
  await trigger.press('Enter');
  const moveVideo = move.locator('video');
  await moveVideo.evaluate(video => video.play());
  await page.waitForFunction(video => video.currentTime > 0 && video.textTracks.length === 1 &&
    video.textTracks[0].cues?.length > 0 && video.textTracks[0].mode === 'showing',
  await moveVideo.elementHandle());
  const reset = page.locator('[data-help-demo="reset-positions"]').first();
  await reset.locator('button').click();
  await reset.locator('video').evaluate(video => video.play());
  assert.equal(await moveVideo.evaluate(video => video.paused), true,
    'Playing another demonstration pauses the first one');
  await reset.locator('button').click();
  await page.waitForFunction(video => video.paused && video.currentTime === 0,
    await reset.locator('video').elementHandle());
  await move.locator('button').click();
}

export async function exerciseCanvasHelpVideoTeaser(page) {
  const previousViewport = page.viewportSize();
  await page.setViewportSize({ width: 1000, height: 700 });
  const dialog = page.locator('#canvasHelpDialog');
  const target = dialog.locator('[data-help-demo="reset-positions"]');
  const trigger = target.locator('button');
  try {
    await trigger.focus();
    const teaser = await visibleTeaser(target);
    await assertPreviewFits(teaser, dialog);
    const footer = await dialog.locator('.dialog-actions').boundingBox();
    const preview = await teaser.boundingBox();
    assert.ok(preview.y + preview.height <= footer.y, 'The preview does not cover the dialog Close action');
    await page.keyboard.press('Escape');
    await teaser.waitFor({ state: 'hidden' });
    assert.equal(await dialog.evaluate(element => element.open), true,
      'The first Escape dismisses the preview without closing the help dialog');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await page.locator('#canvasHelpBtn').click();
    assert.equal(await teaser.isVisible(), false, 'A dismissed preview stays closed when help reopens');

    // Mouse users must be able to move from the trigger into the preview.
    await trigger.hover();
    await visibleTeaser(target);
    await teaser.hover();
    assert.equal(await teaser.isVisible(), true, 'Hovering the preview keeps it available');
    await page.keyboard.press('Escape');
    await teaser.waitFor({ state: 'hidden' });
    await page.mouse.move(0, 0);
    await page.setViewportSize({ width: 1000, height: 480 });
    await dialog.locator('#canvasHelpTitle').focus();
    await trigger.focus();
    await visibleTeaser(target);
    await assertPreviewFits(teaser, dialog);
    const shortFooter = await dialog.locator('.dialog-actions').boundingBox();
    const focusedButton = await trigger.boundingBox();
    assert.ok(focusedButton.y + focusedButton.height <= shortFooter.y,
      'Keyboard focus scrolls the trigger clear of the sticky footer');
    assert.equal(await teaser.evaluate(element => element.scrollHeight <= element.clientHeight + 1), true,
      'The full preview description is readable without scrolling a tooltip');
    await page.keyboard.press('Escape');
  } finally {
    await page.mouse.move(0, 0);
    await page.setViewportSize(previousViewport);
  }
}
