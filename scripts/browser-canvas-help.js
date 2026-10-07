import assert from 'node:assert/strict';

/** The panel must supply working help even when its host knows only ViewerPanel. */
export async function exerciseStandaloneCanvasHelp(page, origin) {
  const appURL = origin + '/src/ui/components/app.js';
  await page.route(appURL, route => route.fulfill({ contentType: 'text/javascript', body: `
    import { viewerComponent } from './context.js';
    import ViewerPanel from './viewer-panel.js';
    export default viewerComponent('ViewerHost', '<ViewerPanel />', { ViewerPanel });
  ` }));
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
    await page.keyboard.press('Escape');
    assert.equal(await help.evaluate(element => element === document.activeElement), true);
    await help.click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await dialog.count(), 0, 'Close dismisses help from the accessibility tree');
  } finally {
    await page.unroute(appURL);
  }
}
