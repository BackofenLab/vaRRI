import assert from 'node:assert/strict';
import { openPanel, ready } from './helpers.js';

export default {
  id: 'apply-probability-profile', title: 'Apply a probability profile', stage: 'full-ui', zoom: false,
  placements: ['docs:probability-profiles'],
  parameters: { hideFooterAndHeader: '1', sequence: 'ACGU&UGCA', structure: '((..&..))', startIndex1: '-2' },
  description: 'Enter profile values, choose biological start-index coordinates, and apply the nucleotide color gradient.',
  async prepare(page) { await openPanel(page, '#profileData1'); },
  async run(capture, page) {
    await capture.caption('Enter indexed values');
    await capture.fill(page.locator('#profileData1'), '-2 0.15\n-1 0.45\n1 0.8\n2 1.0');
    await capture.caption('Use start-based indices');
    await capture.select(page.locator('#profileIdxRef1'), 'start');
    await capture.caption('Full color means zero');
    await capture.click(page.locator('#profileColorRepresentsOne1'));
    await capture.caption('Apply renders the profile as a color gradient');
    await capture.click(page.locator('#profileApplyBtn'));
    await ready(page);
    assert.equal((await page.locator('#profileCounterUI').textContent()).trim(), '(1)');
    const fills = await page.locator('#rendering-canvas circle[node_type="nucleotide"]').evaluateAll(nodes =>
      new Set(nodes.map(node => getComputedStyle(node).fill)).size);
    assert.ok(fills > 2, 'The applied profile must produce a visible gradient');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.2);
  },
};
