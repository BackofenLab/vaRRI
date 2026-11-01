import assert from 'node:assert/strict';
import { openPanel } from './helpers.js';

export default {
  id: 'place-text-annotation', title: 'Place a text annotation', stage: 'full-ui', zoom: false,
  placements: ['docs:text-annotations'],
  parameters: { hideFooterAndHeader: '1' },
  description: 'Create a text label, then drag its unpositioned list entry onto the drawing.',
  async prepare(page) { await openPanel(page, '#textAnnotationSubmitBtn'); },
  async run(capture, page) {
    await capture.caption('Open the text annotation dialog');
    await capture.click(page.locator('#textAnnotationSubmitBtn'));
    await page.locator('#textAnnotationDialog').waitFor({ state: 'visible' });

    await capture.caption('Enter Binding site as the annotation text');
    await capture.fill(page.locator('#textAnnotationText'), 'Binding site');
    assert.equal(await page.locator('#textAnnotationText').inputValue(), 'Binding site');

    await capture.caption('Turn on Bold to emphasize the label');
    await capture.click(page.locator('#textAnnotationBold'));
    assert.equal(await page.locator('#textAnnotationBold').isChecked(), true);

    await capture.caption('Click OK to add the label to the list');
    await capture.click(page.locator('#textAnnotationDialog button[value="ok"]'));
    await page.locator('#textAnnotationDialog').waitFor({ state: 'hidden' });
    const item = page.locator('.text-annotation-item').filter({ hasText: 'Binding site' });
    assert.equal(await item.locator('[aria-label="Unpositioned"]').count(), 1);
    const label = page.locator('#rendering-canvas [data-varri-text] text').filter({ hasText: 'Binding site' });
    assert.equal(await label.count(), 0, 'The label stays off the canvas until placed');

    const canvas = await page.locator('#rendering-canvas').boundingBox();
    const destination = { x: canvas.x + canvas.width * 0.56, y: canvas.y + canvas.height * 0.28 };
    await capture.caption('The ? means unpositioned. Drag the label onto the drawing');
    await capture.dragTo(item.locator('.text-annotation-preview'), destination);
    await page.waitForFunction(() => [...document.querySelectorAll('.text-annotation-item')]
      .some(item => item.textContent.includes('Binding site') && item.querySelector('[aria-label="Positioned"]')));
    assert.equal(await label.count(), 1, 'Exactly one label is drawn after the drop');
    assert.equal(await label.getAttribute('font-weight'), 'bold');
    const placed = await label.evaluate(element => {
      const transform = element.closest('[data-varri-text]').getScreenCTM();
      return { x: transform.e, y: transform.f };
    });
    assert.ok(Math.hypot(placed.x - destination.x, placed.y - destination.y) < 1,
      'The annotation is positioned at the actual pointer drop location');
    assert.equal(await item.locator('[aria-label="Unpositioned"]').count(), 0);

    await capture.caption('The target icon confirms the label is positioned');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.5);
  },
};
