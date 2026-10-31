import assert from 'node:assert/strict';

const canvas = '#rendering-canvas';
const name = `${canvas} [data-varri-sequence-name="1"] text`;
const labels = `${canvas} [label_type="label"]`;

export default {
  id: 'name-and-number-strand', title: 'Name and number a strand',
  stage: 'full-ui', zoom: false,
  placements: ['docs:sequence-and-structure-input-fields', 'input-panel:numbering'],
  parameters: {
    sequence: 'GGAAUU&AAUUCC', structure: '((....&....))',
    forceLayout: '0', startIndex1: '1', startIndex2: '1', hideFooterAndHeader: '1',
  },
  description: 'Commit a strand name and a negative biological start index, with numbering that skips zero.',
  async run(capture, page) {
    assert.equal(await page.locator('#seqName1').inputValue(), 'RNA 1');
    assert.equal(await page.locator('#startIndex1').inputValue(), '1');
    assert.equal(await page.locator(name).textContent(), 'RNA 1');
    assert.equal(await page.locator(labels).count(), 4);

    await capture.caption('Name the first strand Leader RNA, then press Enter');
    await capture.fill(page.locator('#seqName1'), 'Leader RNA');
    await capture.press('Enter', undefined, () => page.waitForFunction(() =>
      document.querySelector('#seqName1')?.value === 'Leader RNA' &&
      document.querySelector('#rendering-canvas [data-varri-sequence-name="1"] text')
        ?.textContent === 'Leader RNA' &&
      document.querySelectorAll('#rendering-canvas [label_type="label"]').length === 4));
    await capture.move({ x: 365, y: 160 });
    await capture.hold(1.5);

    await capture.caption('Set Start 1 to -2, then press Enter');
    await capture.fill(page.locator('#startIndex1'), '-2');
    await capture.press('Enter', undefined, () => page.waitForFunction(() => {
      const drawing = document.querySelector('#rendering-canvas');
      const values = [...drawing.querySelectorAll('[label_type="label"]')]
        .map(label => label.textContent);
      return document.querySelector('#startIndex1')?.value === '-2' &&
        drawing.style.visibility !== 'hidden' &&
        drawing.querySelectorAll('circle[node_type="nucleotide"]').length === 12 &&
        drawing.querySelector('[data-varri-sequence-name="1"] text')?.textContent === 'Leader RNA' &&
        JSON.stringify(values) === JSON.stringify(['-2', '1', '4', '1', '6']);
    }));
    assert.deepEqual(await page.locator(`${canvas} circle[node_type="nucleotide"] title`)
      .evaluateAll(titles => titles.slice(0, 6).map(title => title.textContent)),
    ['s1[-2]', 's1[-1]', 's1[1]', 's1[2]', 's1[3]', 's1[4]']);
    assert.equal(await page.locator('#sequence').inputValue(), 'GGAAUU&AAUUCC');
    assert.equal(await page.locator('#structure').inputValue(), '((....&....))');
    assert.equal(await page.locator('#msg.error:visible').count(), 0);
    await capture.move({ x: 365, y: 160 });
    await capture.hold(1.5);
    await capture.caption('Numbering skips zero between -1 and 1');
    await capture.clearCaption();
    await capture.hold(3);
  },
};
