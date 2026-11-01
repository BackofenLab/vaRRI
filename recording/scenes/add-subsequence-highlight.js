import assert from 'node:assert/strict';
import { openPanel, ready } from './helpers.js';

export default {
  id: 'add-subsequence-highlight', title: 'Add a subsequence highlight',
  stage: 'dialog', zoom: false,
  placements: ['docs:subsequence-highlights', 'input-panel:subsequences'],
  parameters: {
    sequence: 'AGCU&AGCU', structure: '((..&..))', startIndex2: '101',
    forceLayout: '0', hideFooterAndHeader: '1',
  },
  description: 'Choose the second strand and highlight biological positions 102–103 at half opacity.',
  async prepare(page) {
    await openPanel(page, '#highlightSubmitBtn');
    await page.addStyleTag({ content: `
      #subseqHighlightDialog .highlightInput {
        grid-template-columns: 60px minmax(0, 1fr) 44px 82px;
      }
      #subseqSequence, #subseqAlpha { width: 100%; }
      #subseqAlpha { min-width: 82px; }
    ` });
  },
  async run(capture, page) {
    const overlay = page.locator('#rendering-canvas [data-varri-subseq="true"]');
    assert.equal(await overlay.count(), 0, 'The initial drawing has no subsequence overlay');
    assert.equal(await page.locator('#startIndex2').inputValue(), '101');

    await capture.caption('Click Add in Subsequence Highlights');
    await capture.click(page.locator('#highlightSubmitBtn'));
    await page.locator('#subseqHighlightDialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#subseqColor').inputValue(), '#800080');

    await capture.caption('Choose Seq. 2 for the second RNA strand');
    await capture.select(page.locator('#subseqSequence'), '2');
    assert.equal(await page.locator('#subseqSequence').inputValue(), '2');

    await capture.caption('Enter biological range 102-103');
    await capture.fill(page.locator('#subseqRange'), '102-103');
    assert.equal(await page.locator('#subseqRange').inputValue(), '102-103');

    await capture.caption('Set opacity to 0.5');
    await capture.select(page.locator('#subseqAlpha'), '0.5');
    assert.equal(await page.locator('#subseqAlpha').inputValue(), '0.5');
    assert.equal(await page.locator('#subseqColor').inputValue(), '#800080');

    await capture.caption('Click OK to add the highlight');
    await capture.click(page.locator('#subseqHighlightDialog button[value="ok"]'));
    await ready(page);
    await overlay.waitFor({ state: 'visible' });
    assert.equal(await page.locator('#subseqHighlightDialog').isVisible(), false);
    assert.equal(await page.locator('#highlight-list .highlight-item').count(), 1);
    assert.match(await page.locator('#highlight-list').textContent(), /2.*102-103/);
    assert.equal(await overlay.count(), 1, 'Exactly one real subsequence overlay is drawn');
    const geometry = await overlay.evaluate(element => ({
      tag: element.tagName,
      opacity: getComputedStyle(element).opacity,
      stroke: getComputedStyle(element).stroke,
      points: [...element.points].map(point => [point.x, point.y]),
      expected: [6, 7].map(id => {
        const node = document.querySelector(`#rendering-canvas g[num="n${id}"]`);
        const transform = node.transform.baseVal.consolidate().matrix;
        return [transform.e, transform.f];
      }),
    }));
    assert.equal(geometry.tag, 'polyline');
    assert.equal(geometry.opacity, '0.5');
    assert.equal(geometry.stroke, 'rgb(128, 0, 128)');
    assert.equal(geometry.points.length, 2, 'The range spans exactly nodes 6 and 7');
    geometry.points.forEach((point, index) => point.forEach((value, axis) =>
      assert.ok(Math.abs(value - geometry.expected[index][axis]) < 0.001,
        'The overlay must follow biological positions 102 and 103 on strand 2')));
    assert.deepEqual(await page.locator('#rendering-canvas circle[node_type="nucleotide"] title')
      .evaluateAll(titles => titles.slice(5, 7).map(title => title.textContent)),
    ['s2[102]', 's2[103]']);
    assert.equal(await page.locator('#sequence').inputValue(), 'AGCU&AGCU');
    assert.equal(await page.locator('#structure').inputValue(), '((..&..))');
    assert.equal(await page.locator('#msg.error:visible').count(), 0);

    await capture.move({ x: 365, y: 160 });
    await capture.hold(1);
    await capture.caption('The purple range is highlighted and listed');
    await capture.clearCaption();
    await capture.hold(3);
  },
};
