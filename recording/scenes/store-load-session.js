import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ready } from './helpers.js';

export default {
  id: 'store-load-session', title: 'Store and load a session', stage: 'full-ui', zoom: false,
  placements: ['docs:saved-session', 'docs:json-session'],
  parameters: { hideFooterAndHeader: '1', sequence: 'ACGU&UGCA', structure: '((..&..))', seqName1: 'Saved RNA' },
  description: 'Download the current JSON session, clear the viewer, and load the file to restore the figure.',
  async run(capture, page) {
    await capture.caption('Click Store to download this session as a JSON file');
    const downloadPromise = page.waitForEvent('download');
    await capture.click(page.locator('#storeJsonBtn'));
    const download = await downloadPromise;
    const stored = await download.path();
    assert.ok(stored);
    assert.equal(download.suggestedFilename(), 'vaRRI_session.json');
    const session = JSON.parse(await fs.readFile(stored, 'utf8'));
    assert.equal(session.format, 'vaRRI');
    assert.equal(session.version, 1);
    assert.equal(session.fields.sequence, 'ACGU&UGCA');
    assert.equal(session.fields.structure, '((..&..))');
    assert.equal(session.fields.seqName1, 'Saved RNA');
    await capture.caption('Click Clear to empty the inputs and remove the figure');
    await capture.click(page.locator('#clearAllBtn'));
    assert.equal(await page.locator('#sequence').inputValue(), '');
    assert.equal(await page.locator('#structure').inputValue(), '');
    assert.equal(await page.locator('#rendering-canvas circle[node_type="nucleotide"]').count(), 0);
    await capture.hold(1.2);
    await capture.caption('Click Load, then choose vaRRI_session.json in the file picker');
    const chooserPromise = page.waitForEvent('filechooser');
    await capture.click(page.locator('#loadJsonBtn'));
    const chooser = await chooserPromise;
    await chooser.setFiles(stored);
    await ready(page);
    await page.waitForFunction(() => document.getElementById('seqName1')?.value === 'Saved RNA');
    for (const field of ['sequence', 'structure', 'seqName1']) {
      assert.equal(await page.locator(`#${field}`).inputValue(), session.fields[field]);
    }
    assert.equal(await page.locator('#rendering-canvas circle[node_type="nucleotide"]').count(), 8);
    assert.equal(await page.locator('#msg.error:visible').count(), 0);
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.5);
    await capture.caption('The saved inputs and RNA figure are restored');
    await capture.clearCaption();
    await capture.hold(1.5);
  },
};
