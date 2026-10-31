import assert from 'node:assert/strict';
import { openPanel } from './helpers.js';

const region = '#rendering-canvas [data-varri-region="true"]';
const entries = '#region-list .highlight-item';
const expected = {
  nothing: { ranges: [], paths: [] },
  region: { ranges: ['1-5&1-5'], paths: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1]] },
  basepairs: { ranges: ['1-2&4-5', '4-5&1-2'], paths: [[1, 2, 9, 10, 1], [4, 5, 6, 7, 4]] },
};

async function waitForBackground(page, mode) {
  await page.waitForFunction(({ mode, ranges, region, entries }) => {
    const canvas = document.querySelector('#rendering-canvas');
    const labels = [...document.querySelectorAll(`${entries} .highlight-item-main`)]
      .map(button => button.textContent.trim());
    return document.querySelector('#backgroundhighlighting')?.value === mode &&
      canvas?.style.visibility !== 'hidden' &&
      canvas?.querySelectorAll('circle[node_type="nucleotide"]').length === 10 &&
      document.querySelectorAll(region).length === ranges.length &&
      JSON.stringify(labels) === JSON.stringify(ranges);
  }, { mode, ranges: expected[mode].ranges, region, entries });
}

async function assertBackground(page, mode) {
  await waitForBackground(page, mode);
  const { ranges, paths } = expected[mode];
  assert.deepEqual(await page.locator(`${entries} .highlight-item-main`).allTextContents(), ranges);
  assert.equal(await page.locator(`${entries}.generated`).count(), ranges.length);
  assert.equal(await page.locator(`${entries}:not(.generated)`).count(), 0);
  assert.equal(await page.locator(`${entries} .highlight-delete`).count(), 0);
  for (const button of await page.locator(`${entries} .highlight-item-main`).all()) {
    assert.equal(await button.isDisabled(), true, 'Generated regions cannot be edited');
    assert.equal(await button.getAttribute('title'), 'Generated region highlight');
  }
  assert.equal((await page.locator('#regionCounterUI').textContent()).trim(),
    ranges.length ? `(${ranges.length})` : '');
  assert.equal(await page.locator('#region-list .highlight-empty').count(), ranges.length ? 0 : 1);
  const geometry = await page.locator(region).evaluateAll((elements, paths) => ({
    polygons: elements.map(element => ({
      tag: element.tagName,
      fill: getComputedStyle(element).fill,
      opacity: getComputedStyle(element).opacity,
      points: [...element.points].map(point => [point.x, point.y]),
    })),
    expected: paths.map(path => path.map(id => {
      const node = document.querySelector(`#rendering-canvas g[num="n${id}"]`);
      const transform = node.transform.baseVal.consolidate().matrix;
      return [transform.e, transform.f];
    })),
  }), paths);
  assert.equal(geometry.polygons.length, paths.length);
  for (const polygon of geometry.polygons) {
    assert.equal(polygon.tag, 'polygon');
    assert.equal(polygon.fill, 'rgb(255, 0, 0)');
    assert.equal(polygon.opacity, '0.2');
    const match = geometry.expected.findIndex(path => path.length === polygon.points.length &&
      path.every((point, index) => point.every((value, axis) =>
        Math.abs(value - polygon.points[index][axis]) < 0.001)));
    assert.notEqual(match, -1, 'Every polygon must follow its exact real nucleotide range');
    geometry.expected.splice(match, 1);
  }
  assert.equal(geometry.expected.length, 0, 'Every expected range has its own polygon');
  assert.equal(await page.locator('#sequence').inputValue(), 'GGAGG&CCACC');
  assert.equal(await page.locator('#structure').inputValue(), '((.((&)).))');
  assert.equal(await page.locator('#highlighting').inputValue(), 'nothing');
  assert.equal(await page.locator('#forceLayout').isChecked(), false);
  assert.equal(await page.locator('#msg.error:visible').count(), 0);
}

export default {
  id: 'highlight-rri-background', title: 'Highlight the RRI background',
  stage: 'full-ui', zoom: false,
  placements: ['docs:region-highlights', 'input-panel:rri-background'],
  parameters: {
    sequence: 'GGAGG&CCACC', structure: '((.((&)).))',
    forceLayout: '0', highlighting: 'nothing', backgroundhighlighting: 'nothing',
    hideFooterAndHeader: '1',
  },
  description: 'Use the RRI background dropdown to generate one whole-region highlight, separate paired-stack highlights, or remove the automatic highlights.',
  async prepare(page) {
    await openPanel(page, '#backgroundhighlighting');
    await page.addStyleTag({ content: `
      .label-dropdown-col-row {
        grid-template-columns: 132px minmax(0, 1fr) 22px;
        gap: 6px;
      }
    ` });
  },
  async run(capture, page) {
    const select = page.locator('#backgroundhighlighting');
    await assertBackground(page, 'nothing');
    assert.equal(await page.locator('#colorRriRegion').inputValue(), '#ff0000');

    await capture.caption('Choose region: this dropdown controls automatic RRI backgrounds');
    await capture.click(select);
    await capture.press('Home');
    await capture.press('ArrowDown');
    await capture.press('Enter', undefined, () => waitForBackground(page, 'region'));
    await assertBackground(page, 'region');
    await capture.move({ x: 365, y: 160 });
    await capture.hold(0.75);
    await capture.caption('Region adds one generated highlight: 1-5&1-5');
    await capture.clearCaption();
    await capture.hold(1.5);

    await capture.caption('Choose basepairs to separate the two paired stacks');
    await capture.click(select);
    await capture.press('Home');
    await capture.press('Enter', undefined, () => waitForBackground(page, 'basepairs'));
    await assertBackground(page, 'basepairs');
    await capture.move({ x: 365, y: 160 });
    await capture.hold(0.75);
    await capture.caption('Two generated highlights leave the unpaired A bases clear');
    await capture.clearCaption();
    await capture.hold(1.5);

    await capture.caption('Choose nothing to remove the automatic highlights');
    await capture.click(select);
    await capture.press('Home');
    await capture.press('ArrowDown');
    await capture.press('ArrowDown');
    await capture.press('Enter', undefined, () => waitForBackground(page, 'nothing'));
    await assertBackground(page, 'nothing');
    await capture.move({ x: 365, y: 160 });
    await capture.hold(0.75);
    await capture.caption('The generated entries and backgrounds are gone; the input is unchanged');
    await capture.clearCaption();
    await capture.hold(2.5);
  },
};
