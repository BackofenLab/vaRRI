import assert from 'node:assert/strict';
import { openPanel } from './helpers.js';

const nucleotide = '#rendering-canvas circle[node_type="nucleotide"]';
// An asymmetric bulge starts bent; the symmetric 10-node highlighting fixture
// already has horizontal paired rails before this option is enabled.
const pairs = [[1, 9], [2, 8], [4, 7], [5, 6]];
const tolerance = 1e-6;

const coordinates = page => page.locator(nucleotide).evaluateAll(elements =>
  elements.map(element => {
    const { num, x, y } = element.__data__;
    return { num, x, y };
  }));

async function assertStatic(page) {
  const before = await coordinates(page);
  assert.deepEqual(before.map(node => node.num), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(before.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)));
  await page.waitForTimeout(250);
  assert.deepEqual(await coordinates(page), before, 'Force-off coordinates remain unchanged');
  assert.equal(await page.locator('#forceLayout').isChecked(), false);
  assert.equal(await page.locator('#forceLayoutLinearStructure').isChecked(), false);
  assert.equal(await page.locator('#highlighting').inputValue(), 'nothing');
  assert.equal(await page.locator('#backgroundhighlighting').inputValue(), 'nothing');
  assert.equal(await page.locator('#rendering-canvas [data-varri-text]').count(), 0);
  assert.equal(await page.locator('#msg.error:visible').count(), 0);
  return before;
}

async function waitForHorizontalLayout(page, before) {
  await page.waitForFunction(({ nucleotide, pairs, tolerance, before }) => {
    const canvas = document.querySelector('#rendering-canvas');
    const elements = [...document.querySelectorAll(nucleotide)];
    if (canvas?.style.visibility === 'hidden' || elements.length !== 9 ||
        !document.querySelector('#forceLayoutLinearRRI')?.checked ||
        document.querySelector('#forceLayout')?.checked) return false;
    const nodes = new Map(elements.map(element => [element.__data__.num, element.__data__]));
    const upperY = nodes.get(1)?.y;
    const lowerY = nodes.get(9)?.y;
    return elements.every(element => {
      const { x, y } = element.__data__;
      const matrix = element.parentElement.transform.baseVal.consolidate()?.matrix;
      // SVG transform matrices round to float precision; model rail checks below
      // still require the tighter double-precision geometry tolerance.
      return Number.isFinite(x) && Number.isFinite(y) && matrix &&
        Math.abs(matrix.e - x) < 0.001 && Math.abs(matrix.f - y) < 0.001;
    }) && pairs.every(([a, b]) => {
      const upper = nodes.get(a), lower = nodes.get(b);
      return upper && lower && Math.abs(upper.y - upperY) < tolerance &&
        Math.abs(lower.y - lowerY) < tolerance && Math.abs(upper.x - lower.x) < tolerance &&
        Math.abs(Math.hypot(upper.x - lower.x, upper.y - lower.y) - 15) < tolerance;
    }) && before.some(node => {
      const current = nodes.get(node.num);
      return Math.abs(node.x - current.x) > 0.1 || Math.abs(node.y - current.y) > 0.1;
    });
  }, { nucleotide, pairs, tolerance, before });
}

export default {
  id: 'linearize-rri-layout', title: 'Make the RRI horizontal',
  stage: 'full-ui', zoom: false,
  placements: ['docs:visualisation-settings', 'input-panel:linear-layout'],
  parameters: {
    sequence: 'GGAGG&CCCC', structure: '((.((&))))', textAnnotations: '[]',
    forceLayout: '0', forceLayoutLinearRRI: '0', forceLayoutLinearStructure: '0',
    highlighting: 'nothing', backgroundhighlighting: 'nothing', hideFooterAndHeader: '1',
  },
  description: 'Enable Linear horizontal RRI layout to create stable paired rails while Force layout stays off.',
  async prepare(page) {
    await openPanel(page, '#forceLayoutLinearRRI');
    await page.addStyleTag({ content: `
      .label-dropdown-col-row {
        grid-template-columns: 132px minmax(0, 1fr) 22px;
        gap: 6px;
      }
    ` });
  },
  async run(capture, page) {
    const linear = page.locator('#forceLayoutLinearRRI');
    assert.equal(await linear.isChecked(), false);
    const before = await assertStatic(page);
    const initialRail = pairs.map(([a]) => before.find(node => node.num === a).y);
    assert.ok(Math.max(...initialRail) - Math.min(...initialRail) > 0.1,
      'The initial interaction is visibly bent before the real checkbox click');

    await capture.caption('With Force layout off, enable Linear horizontal RRI layout');
    await capture.clearCaption();
    await capture.hold(2);
    await capture.click(linear, undefined, () => waitForHorizontalLayout(page, before));

    assert.equal(await linear.isChecked(), true);
    const after = await assertStatic(page);
    assert.notDeepEqual(after, before, 'The checkbox must change the actual graph coordinates');
    const nodes = new Map(after.map(node => [node.num, node]));
    for (const [a, b] of pairs) {
      const upper = nodes.get(a), lower = nodes.get(b);
      assert.ok(Math.abs(upper.y - nodes.get(1).y) < tolerance, 'First paired rail is horizontal');
      assert.ok(Math.abs(lower.y - nodes.get(9).y) < tolerance, 'Second paired rail is horizontal');
      assert.ok(Math.abs(upper.x - lower.x) < tolerance, 'Each pair is vertically aligned');
      assert.ok(Math.abs(Math.hypot(upper.x - lower.x, upper.y - lower.y) - 15) < tolerance);
    }
    assert.equal(await page.locator('#sequence').inputValue(), 'GGAGG&CCCC');
    assert.equal(await page.locator('#structure').inputValue(), '((.((&))))');
    await capture.move({ x: 365, y: 160 });
    await capture.hold(1);
    await capture.caption('Paired bases now form horizontal rails; Force layout stays off');
    await capture.clearCaption();
    await capture.hold(4);
  },
};
