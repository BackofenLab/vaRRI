import assert from 'node:assert/strict';
import { openPanel } from './helpers.js';

export default {
  id: 'place-text-annotation', title: 'Place a text annotation', stage: 'full-ui', zoom: false,
  placements: ['docs:text-annotations'],
  parameters: { hideFooterAndHeader: '1' },
  description: 'Create a text label, then drag its unpositioned list entry onto the drawing.',
  async prepare(page) { await openPanel(page, '#textAnnotationSubmitBtn'); },
  async run(capture, page) {
    await capture.caption('Add a text annotation');
    await capture.hold(0.5);
    await capture.click(page.locator('#textAnnotationSubmitBtn'));
    await capture.fill(page.locator('#textAnnotationText'), 'Binding site');
    await capture.click(page.locator('#textAnnotationBold'));
    await capture.click(page.locator('#textAnnotationDialog button[value="ok"]'));
    const item = page.locator('.text-annotation-item').filter({ hasText: 'Binding site' });
    assert.equal(await item.locator('[aria-label="Unpositioned"]').count(), 1);
    await capture.caption('? means unpositioned');
    await capture.hold(1);
    const canvas = await page.locator('#rendering-canvas').boundingBox();
    await capture.caption('Drag the label from the list onto the drawing');
    await capture.dragTo(item.locator('.text-annotation-preview'),
      { x: canvas.x + canvas.width * 0.56, y: canvas.y + canvas.height * 0.28 });
    await page.waitForFunction(() => [...document.querySelectorAll('.text-annotation-item')]
      .some(item => item.textContent.includes('Binding site') && item.querySelector('[aria-label="Positioned"]')));
    assert.equal(await page.locator('#rendering-canvas [data-varri-text] text').filter({ hasText: 'Binding site' }).count(), 1);
    await capture.caption('Target icon confirms placement');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.1);
  },
};
