import assert from 'node:assert/strict';
import fs from 'node:fs';

/** The panel must supply working help even when its host knows only ViewerPanel. */
export async function exerciseStandaloneCanvasHelp(page, origin) {
  const appURL = origin + '/src/ui/components/app.js';
  await page.route(appURL, route => route.fulfill({ contentType: 'text/javascript', body: `
    import { viewerComponent } from './context.js';
    import ViewerPanel from './viewer-panel.js';
    export default viewerComponent('ViewerHost', '<ViewerPanel />', { ViewerPanel });
  ` }));
  // Reproduce the review screenshot: the general dialog theme is cached without
  // the newer help-specific rules. Component styles must still center the help.
  const cssURL = origin + '/src/ui/styles/dialogs.css';
  const oldCSS = fs.readFileSync(new URL('../src/ui/styles/dialogs.css', import.meta.url), 'utf8')
    .split('dialog.canvas-help-dialog')[0];
  await page.route(cssURL, route => route.fulfill({ contentType: 'text/css', body: oldCSS }));
  try {
    await page.goto(origin + '/index.html?showRenderingOnly=1&sequence=AAAA%26UUUU&structure=((..%26..))&forceLayout=0',
      { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#rendering-canvas circle') &&
      document.getElementById('rendering-canvas').style.visibility !== 'hidden');
    const help = page.getByRole('button', { name: 'Canvas interaction help', exact: true });
    await help.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Canvas interactions', exact: true });
    assert.equal(await dialog.count(), 1, 'The help button supplies exactly one accessible dialog');
    assert.equal(await dialog.isVisible(), true, 'Keyboard activation opens visible help');
    assert.equal(await dialog.evaluate(element => element.matches(':modal')), true, 'Help enters the modal top layer');
    await checkCanvasHelpStyles(page);
    await page.keyboard.press('Escape');
    assert.equal(await help.evaluate(element => element === document.activeElement), true);
    await help.click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await dialog.count(), 0, 'Close dismisses help from the accessibility tree');
  } finally {
    await page.unroute(appURL);
    await page.unroute(cssURL);
  }
}

/** Check geometry and recognizable, noninteractive button names in the help. */
export async function checkCanvasHelpStyles(page) {
  const dialog = page.locator('#canvasHelpDialog');
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box.width <= 542 && box.width <= viewport.width - 30, 'Help has a bounded width');
  assert.ok(Math.abs(box.x + box.width / 2 - viewport.width / 2) < 2, 'Help is horizontally centered');
  assert.ok(Math.abs(box.y + box.height / 2 - viewport.height / 2) < 2, 'Help is vertically centered');
  assert.equal(await dialog.locator('dt').first().evaluate(el => getComputedStyle(el).fontWeight), '700');
  const keys = dialog.locator('dt .canvas-position-key');
  assert.deepEqual(await keys.allTextContents(), ['Moved', 'Release', 'Reset', 'Undo']);
  const appearances = await keys.evaluateAll(elements => elements.map(el => {
    const style = getComputedStyle(el);
    return { border: style.border, radius: style.borderRadius, padding: style.padding,
      height: style.height, fontSize: style.fontSize, weight: style.fontWeight, tag: el.tagName };
  }));
  // Enable a toolbar button only to compare its normal appearance with the key.
  const expected = await page.locator('#selectMovedBtn').evaluate(el => {
    const disabled = el.disabled;
    el.disabled = false;
    const style = getComputedStyle(el);
    const result = { border: style.border, radius: style.borderRadius, padding: style.padding,
      height: style.height, fontSize: style.fontSize, weight: '700', tag: 'SPAN' };
    el.disabled = disabled;
    return result;
  });
  appearances.forEach(appearance => assert.deepEqual(appearance, expected));
}
