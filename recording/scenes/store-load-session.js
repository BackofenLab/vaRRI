import assert from 'node:assert/strict';
import { ready } from './helpers.js';

export default {
  id: 'store-load-session', title: 'Store and load a session', stage: 'full-ui', zoom: false,
  placements: ['docs:saved-session', 'docs:json-session'],
  parameters: { hideFooterAndHeader: '1', sequence: 'ACGU&UGCA', structure: '((..&..))', seqName1: 'Saved RNA' },
  description: 'Download the current JSON session, clear the viewer, and load the file to restore the figure.',
  async run(capture, page) {
    await capture.caption('Store saves session JSON');
    const downloadPromise = page.waitForEvent('download');
    await capture.click(page.locator('#storeJsonBtn'));
    const download = await downloadPromise;
    const stored = await download.path();
    assert.ok(stored);
    await capture.caption('Clear empties inputs');
    await capture.click(page.locator('#clearAllBtn'));
    assert.equal(await page.locator('#sequence').inputValue(), '');
    await capture.caption('Load the saved JSON');
    const chooserPromise = page.waitForEvent('filechooser');
    await capture.click(page.locator('#loadJsonBtn'));
    const chooser = await chooserPromise;
    await chooser.setFiles(stored);
    await ready(page);
    await page.waitForFunction(() => document.getElementById('seqName1')?.value === 'Saved RNA');
    assert.equal(await page.locator('#sequence').inputValue(), 'ACGU&UGCA');
    await capture.caption('Inputs and figure are restored');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.2);
  },
};
