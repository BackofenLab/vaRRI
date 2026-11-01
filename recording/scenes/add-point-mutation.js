import assert from 'node:assert/strict';
import { openPanel, ready } from './helpers.js';

export default {
  id: 'add-point-mutation', title: 'Annotate a point mutation',
  stage: 'dialog', zoom: false,
  placements: ['docs:point-mutations', 'input-panel:mutations'],
  parameters: {
    sequence: 'AGCU&AGCU', structure: '((..&..))', startIndex2: '101',
    forceLayout: '0', hideFooterAndHeader: '1',
  },
  description: 'Annotate G102A on the second strand of the supplied structure without editing the input sequence or predicting a fold.',
  async prepare(page) {
    await openPanel(page, '#mutationSubmitBtn');
    await page.addStyleTag({ content: `
      #mutationDialog .mutationInput {
        grid-template-columns: 60px minmax(0, 1fr) 60px 44px;
      }
    ` });
  },
  async run(capture, page) {
    const target = page.locator('#rendering-canvas circle[node_num="6"]');
    const replacement = page.locator('#rendering-canvas [label_gnum="6"] text[label_type="label"]');
    assert.equal(await page.locator('#mutation-list .mutation-item').count(), 0);
    assert.equal(await page.locator('#startIndex2').inputValue(), '101');
    assert.equal(await target.locator('title').textContent(), 's2[102]');

    await capture.caption('Click Add in Point Mutations to annotate the supplied structure');
    await capture.click(page.locator('#mutationSubmitBtn'));
    await page.locator('#mutationDialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#mutationColor').inputValue(), '#006400');

    await capture.caption('Choose Seq. 2 for the second RNA strand');
    await capture.select(page.locator('#mutationSequence'), '2');
    assert.equal(await page.locator('#mutationSequence').inputValue(), '2');

    await capture.caption('Enter biological position 102');
    await capture.fill(page.locator('#mutationPosition'), '102');
    assert.equal(await page.locator('#mutationPosition').inputValue(), '102');

    await capture.caption('Enter A in To for the replacement annotation');
    await capture.fill(page.locator('#mutationBase'), 'A');
    assert.equal(await page.locator('#mutationBase').inputValue(), 'A');
    assert.equal(await page.locator('#mutationColor').inputValue(), '#006400');

    await capture.caption('Click OK to add the G102A annotation');
    await capture.click(page.locator('#mutationDialog button[value="ok"]'));
    await ready(page);
    await replacement.waitFor({ state: 'visible' });
    assert.equal(await page.locator('#mutationDialog').isVisible(), false);
    assert.equal(await page.locator('#mutation-list .mutation-item').count(), 1);
    assert.match(await page.locator('#mutation-list').textContent(), /Seq 2\s*:\s*G102A/);
    assert.equal(await target.locator('title').textContent(), 's2[102]');
    assert.equal(await page.locator('#rendering-canvas g[num="n6"] text').textContent(), 'G',
      'The original nucleotide remains G; the replacement is an additional annotation');
    assert.equal(await replacement.textContent(), 'A', 'The actual replacement label is visible');
    assert.equal(await page.locator('#rendering-canvas [label_gnum="6"] title').textContent(),
      'Mutation: G102A');
    const annotation = await target.evaluate(element => ({
      stroke: getComputedStyle(element).stroke,
      width: getComputedStyle(element).strokeWidth,
      outlinedNodes: [...document.querySelectorAll('#rendering-canvas circle[node_type="nucleotide"]')]
        .filter(node => getComputedStyle(node).stroke === 'rgb(0, 100, 0)')
        .map(node => node.getAttribute('node_num')),
    }));
    assert.deepEqual(annotation, { stroke: 'rgb(0, 100, 0)', width: '2px', outlinedNodes: ['6'] });
    assert.equal(await replacement.evaluate(element => getComputedStyle(element).fill), 'rgb(0, 100, 0)');
    assert.equal(await page.locator('#sequence').inputValue(), 'AGCU&AGCU');
    assert.equal(await page.locator('#structure').inputValue(), '((..&..))');
    assert.equal(await page.locator('#rendering-canvas circle[node_type="nucleotide"]').count(), 8);
    assert.equal(await page.locator('#msg.error:visible').count(), 0);

    await capture.move({ x: 365, y: 160 });
    await capture.hold(1);
    await capture.caption('G102A adds a green outline and A label; inputs stay unchanged and no fold is predicted');
    await capture.clearCaption();
    await capture.hold(3);
  },
};
