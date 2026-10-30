import assert from 'node:assert/strict';
import { openPanel, ready } from './helpers.js';

export default {
  id: 'apply-probability-profile', title: 'Apply a probability profile', stage: 'full-ui', zoom: false,
  placements: ['docs:probability-profiles'],
  parameters: { hideFooterAndHeader: '1', sequence: 'ACGU&UGCA', structure: '((..&..))', startIndex1: '-2' },
  description: 'Enter profile values, choose biological start-index coordinates, and apply the nucleotide color gradient.',
  async prepare(page) {
    await openPanel(page, '#profileData1');
    await page.addStyleTag({ content: `
      aside[aria-label="Probability profiles"] .checkbox-row { flex-direction: column; align-items: stretch; }
      #profileIdxRef1, #profileIdxRef2 { width: 100%; }
    ` });
  },
  async run(capture, page) {
    const profile = '-2 0.15\n-1 0.45\n1 0.8\n2 1.0';
    await capture.caption('Enter each nucleotide index and its probability for RNA 1.');
    await capture.paste(page.locator('#profileData1'), profile);
    assert.equal(await page.locator('#profileData1').inputValue(), profile);
    await capture.caption('Choose Start 1: indices are -2, -1, 1, 2, skipping zero.');
    await capture.select(page.locator('#profileIdxRef1'), 'start');
    assert.equal(await page.locator('#profileIdxRef1').inputValue(), 'start');
    await ready(page);
    assert.equal(await page.locator('#profileColorRepresentsOne1').isChecked(), true);
    await capture.caption('Uncheck =1 so purple represents zero; higher values fade the overlay.');
    await capture.click(page.locator('#profileColorRepresentsOne1'));
    assert.equal(await page.locator('#profileColorRepresentsOne1').isChecked(), false);
    await ready(page);
    await capture.caption('Click Apply to color RNA 1 using the probability profile.');
    await capture.click(page.locator('#profileApplyBtn'));
    await ready(page);
    assert.equal((await page.locator('#profileCounterUI').textContent()).trim(), '(1)');
    const overlays = await page.locator('#rendering-canvas circle[node_num^="o"]').evaluateAll(nodes =>
      nodes.map(node => ({ id: node.getAttribute('node_num'), opacity: Number(getComputedStyle(node).opacity),
        fill: getComputedStyle(node).fill })));
    assert.deepEqual(overlays.map(node => node.id), ['o1', 'o2', 'o3', 'o4'],
      'Start-based indices must map onto all four RNA 1 nucleotides');
    assert.deepEqual(overlays.map(node => node.opacity), [0.85, 0.55, 0.2, 0],
      'Unchecking =1 must make higher probabilities progressively lighter');
    assert.ok(overlays.every(node => node.fill === 'rgb(128, 0, 128)'),
      'The profile must use the displayed purple color');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.2);
    await capture.caption('Lower probabilities have stronger purple shading on RNA 1.');
    await capture.clearCaption();
    await capture.hold(1.6);
  },
};
