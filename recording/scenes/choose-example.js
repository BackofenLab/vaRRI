import assert from 'node:assert/strict';
import examples from '../../src/ui/examples-data.js';
import { ready } from './helpers.js';

const example = examples['wu-2024'];

export default {
  id: 'choose-example', title: 'Choose an example', stage: 'full-ui', zoom: false,
  placements: ['docs:example-input', 'input-panel:examples'],
  parameters: { hideFooterAndHeader: '1' },
  description: 'Choose Mutations & highlighting to load its RNA input, four mutations, and a subsequence highlight.',
  async run(capture, page) {
    await capture.caption('Open Example to browse the built-in examples');
    await capture.click(page.locator('#exampleDropdownTrigger'));
    assert.equal(await page.locator('#exampleDropdown').evaluate(element => element.open), true);
    await capture.caption('Choose Mutations & highlighting');
    await capture.click(page.locator('[data-example="wu-2024"]'));
    await ready(page);
    await page.waitForFunction(() =>
      document.querySelectorAll('#rendering-canvas circle[node_type="nucleotide"]').length === 61);
    assert.equal(await page.locator('#exampleDropdown').evaluate(element => element.open), false);
    assert.equal(await page.locator('#selectedExampleName').textContent(), example.nameShort);
    for (const field of ['sequence', 'structure', 'startIndex1', 'startIndex2']) {
      assert.equal(await page.locator(`#${field}`).inputValue(), example.vaRRIParams.fields[field]);
    }
    assert.equal(await page.locator('#mutation-list [data-mutation-id]').count(), 4);
    assert.equal(await page.locator('#highlight-list [data-highlight-id]').count(), 1);
    assert.equal(await page.locator('#rendering-canvas [data-varri-subseq]').count(), 1);
    assert.deepEqual(await page.locator('#rendering-canvas [label_type="label"]')
      .evaluateAll(labels => labels.filter(label => label.parentElement.querySelector('title')
        ?.textContent.startsWith('Mutation:')).map(label => label.textContent).sort()), ['C', 'C', 'G', 'G']);
    assert.equal(await page.locator('#msg.error:visible').count(), 0);
    await capture.move({ x: 365, y: 160 });
    await capture.hold(1.5);
    await capture.caption('The inputs and figure include four mutations and a green highlight');
    await capture.clearCaption();
    await capture.hold(3);
  },
};
