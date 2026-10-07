import assert from 'node:assert/strict';
import path from 'node:path';

/** Controls must be visible and hit-testable without Playwright scrolling them into view. */
export async function exercisePositionLayout(page, origin, output) {
  const original = page.viewportSize();
  try {
    for (const [width, height, embedded] of [[938, 480, false], [1280, 569, false], [938, 569, false],
      [901, 731, false], [1280, 720, false], [640, 480, true]]) {
      await page.setViewportSize({ width, height });
      await page.goto(origin + '/index.html' + (embedded
        ? '?showRenderingOnly=1&sequence=AAAA%26UUUU&structure=((..%26..))&forceLayout=0' : ''), { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('#rendering-canvas circle') &&
        document.getElementById('rendering-canvas').style.visibility !== 'hidden');
      if (!embedded) {
        await page.locator('#exampleDropdownTrigger').click();
        await page.locator('[data-example]').first().click();
        await page.waitForFunction(() => document.querySelector('#rendering-caption').textContent.trim() &&
          document.getElementById('rendering-canvas').style.visibility !== 'hidden');
      }
      const controls = await page.locator('.manual-position-controls button, .export-bar button').evaluateAll(elements => {
        const panel = document.querySelector('.result-panel').getBoundingClientRect();
        return elements.filter(element => getComputedStyle(element).display !== 'none').map(element => {
          const r = element.getBoundingClientRect();
          return { id: element.id, inside: r.left >= panel.left && r.right <= panel.right &&
            r.top >= panel.top && r.bottom <= panel.bottom && r.bottom <= innerHeight,
          reachable: element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
        });
      });
      for (const button of controls) {
        assert.ok(button.inside && button.reachable, `${button.id} must remain visible and reachable at ${width}×${height}`);
      }
      await page.locator('#canvasHelpBtn').click();
      const dialog = page.locator('#canvasHelpDialog');
      assert.equal(await dialog.evaluate(element => element.open), true);
      assert.equal(await dialog.evaluate(element => element.scrollTop), 0, 'Help opens at its introduction');
      for (const text of ['Command', 'Select', 'Move', 'Rotate', 'Release', 'Reset', 'Undo']) {
        assert.ok((await dialog.textContent()).includes(text), `Help explains ${text}`);
      }
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
      await page.screenshot({ path: path.join(output, `canvas-help-${width}x${height}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await dialog.evaluate(element => element.open), false);
      assert.equal(await page.locator('#canvasHelpBtn').evaluate(element => element === document.activeElement), true);
      await page.locator('#canvasHelpBtn').click();
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      assert.equal(await dialog.evaluate(element => element.open), false);
      await page.screenshot({ path: path.join(output, `canvas-controls-${width}x${height}.png`) });
    }
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'canvas-layout-failure.png') });
    throw error;
  } finally { await page.setViewportSize(original); }
}
