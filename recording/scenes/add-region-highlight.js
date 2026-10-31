import assert from 'node:assert/strict';
import { openPanel, ready } from './helpers.js';

export default {
  id: 'add-region-highlight', title: 'Add a paired region highlight', stage: 'dialog', zoom: false,
  placements: ['docs:region-highlights'],
  parameters: { hideFooterAndHeader: '1', sequence: 'ACGU&UGCA', structure: '((..&..))', backgroundhighlighting: 'nothing' },
  description: 'Enter one range for each RNA strand and add a translucent paired-region highlight.',
  async prepare(page) {
    await openPanel(page, '#regionSubmitBtn');
    await page.addStyleTag({ content: `
      #regionHighlightDialog .regionInput {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 24px 82px;
      }
      #regionAlpha { width: 100%; min-width: 82px; }
    ` });
  },
  async run(capture, page) {
    const region = page.locator('#rendering-canvas polygon[data-varri-region="true"]');
    assert.equal(await region.count(), 0, 'The initial drawing has no region highlight');
    await capture.caption('Click Add in Region Highlights');
    await capture.click(page.locator('#regionSubmitBtn'));
    await page.locator('#regionHighlightDialog').waitFor({ state: 'visible' });
    await capture.caption('Enter 1-2 for the first RNA strand');
    await capture.fill(page.locator('#region1'), '1-2');
    assert.equal(await page.locator('#region1').inputValue(), '1-2');
    await capture.caption('Enter 3-4 for its partner on the second RNA');
    await capture.fill(page.locator('#region2'), '3-4');
    assert.equal(await page.locator('#region2').inputValue(), '3-4');
    await capture.caption('Set opacity to 0.5 for a translucent highlight');
    await capture.select(page.locator('#regionAlpha'), '0.5');
    assert.equal(await page.locator('#regionAlpha').inputValue(), '0.5');
    await capture.caption('Click OK to add the highlight to the drawing');
    await capture.click(page.locator('#regionHighlightDialog button[value="ok"]'));
    await ready(page);
    assert.equal(await page.locator('#regionHighlightDialog').isVisible(), false);
    assert.equal(await page.locator('#region-list .highlight-item:not(.generated)').count(), 1);
    assert.match(await page.locator('#region-list').textContent(), /1-2&3-4/);
    assert.equal(await region.count(), 1, 'Exactly one real region polygon is drawn');
    const geometry = await region.evaluate(element => ({
      opacity: getComputedStyle(element).opacity,
      points: [...element.points].map(point => [point.x, point.y]),
      expected: [1, 2, 7, 8, 1].map(id => {
        const node = document.querySelector(`#rendering-canvas g[num="n${id}"]`);
        const transform = node.transform.baseVal.consolidate().matrix;
        return [transform.e, transform.f];
      }),
    }));
    assert.equal(geometry.opacity, '0.5');
    assert.equal(geometry.points.length, 5, 'The paired range forms a closed four-node polygon');
    geometry.points.forEach((point, index) => point.forEach((value, axis) =>
      assert.ok(Math.abs(value - geometry.expected[index][axis]) < 0.001,
        'The polygon must follow RNA 1 positions 1-2 and RNA 2 positions 3-4')));
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1);
    await capture.caption('The paired region is highlighted and listed on the left');
    await capture.clearCaption();
    await capture.hold(2);
  },
};
