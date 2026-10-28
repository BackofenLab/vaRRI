import assert from 'node:assert/strict';
import { openPanel, ready } from './helpers.js';

export default {
  id: 'add-region-highlight', title: 'Add a paired region highlight', stage: 'dialog', zoom: false,
  placements: ['docs:region-highlights'],
  parameters: { hideFooterAndHeader: '1', sequence: 'ACGU&UGCA', structure: '((..&..))', backgroundhighlighting: 'nothing' },
  description: 'Enter one range for each RNA strand and add a translucent paired-region highlight.',
  async prepare(page) { await openPanel(page, '#regionSubmitBtn'); },
  async run(capture, page) {
    await capture.caption('Add a paired region highlight');
    await capture.click(page.locator('#regionSubmitBtn'));
    await capture.caption('Enter a biological range for each RNA');
    await capture.fill(page.locator('#region1'), '1-2');
    await capture.fill(page.locator('#region2'), '1-2');
    await capture.select(page.locator('#regionAlpha'), '0.5');
    await capture.caption('OK adds the highlight to the list and drawing');
    await capture.click(page.locator('#regionHighlightDialog button[value="ok"]'));
    await ready(page);
    assert.equal(await page.locator('#region-list .highlight-item:not(.generated)').count(), 1);
    assert.match(await page.locator('#region-list').textContent(), /1-2&1-2/);
    assert.ok(await page.locator('#rendering-canvas [data-region-highlight]').count() > 0 ||
      await page.locator('#rendering-canvas path.region-highlight, #rendering-canvas polygon').count() > 0);
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.2);
  },
};
