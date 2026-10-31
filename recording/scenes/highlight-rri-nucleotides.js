import assert from 'node:assert/strict';
import { openPanel } from './helpers.js';

const allNodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const pairedNodes = [1, 2, 4, 5, 6, 7, 9, 10];
const nucleotide = '#rendering-canvas circle[node_type="nucleotide"]';

async function waitForOutlines(page, mode, expected) {
  await page.waitForFunction(({ mode, expected, nucleotide }) => {
    const canvas = document.querySelector('#rendering-canvas');
    const nodes = [...document.querySelectorAll(nucleotide)];
    const outlined = nodes.filter(node => getComputedStyle(node).stroke === 'rgb(255, 0, 0)')
      .map(node => Number(node.getAttribute('node_num')));
    return document.querySelector('#highlighting')?.value === mode &&
      canvas?.style.visibility !== 'hidden' && nodes.length === 10 &&
      JSON.stringify(outlined) === JSON.stringify(expected);
  }, { mode, expected, nucleotide });
}

async function assertOutlines(page, mode, expected) {
  await waitForOutlines(page, mode, expected);
  const styles = await page.locator(nucleotide).evaluateAll(nodes => nodes.map(node => ({
    id: Number(node.getAttribute('node_num')),
    stroke: getComputedStyle(node).stroke,
    width: getComputedStyle(node).strokeWidth,
  })));
  assert.deepEqual(styles.filter(node => node.stroke === 'rgb(255, 0, 0)').map(node => node.id),
    expected, 'The actual SVG outlines must match the selected RRI mode');
  styles.forEach(node => {
    assert.equal(node.width, '0.8px');
    assert.equal(node.stroke, expected.includes(node.id) ? 'rgb(255, 0, 0)' : 'rgb(204, 204, 204)');
  });
  assert.equal(await page.locator('#backgroundhighlighting').inputValue(), 'nothing');
  assert.equal(await page.locator('#rendering-canvas [data-varri-region="true"]').count(), 0);
  assert.equal(await page.locator('#forceLayout').isChecked(), false);
  assert.equal(await page.locator('#msg.error:visible').count(), 0);
}

export default {
  id: 'highlight-rri-nucleotides', title: 'Highlight RRI nucleotides',
  stage: 'full-ui', zoom: false,
  placements: ['docs:visualisation-settings', 'input-panel:rri-nucleotides'],
  parameters: {
    sequence: 'GGAGG&CCACC', structure: '((.((&)).))',
    forceLayout: '0', highlighting: 'nothing', backgroundhighlighting: 'nothing',
    hideFooterAndHeader: '1',
  },
  description: 'Compare outlines around all ten interaction-region nucleotides with the eight paired nucleotides, excluding the two unpaired A bases.',
  async prepare(page) {
    await openPanel(page, '#highlighting');
    await page.addStyleTag({ content: `
      .label-dropdown-col-row {
        grid-template-columns: 132px minmax(0, 1fr) 22px;
        gap: 6px;
      }
    ` });
  },
  async run(capture, page) {
    const select = page.locator('#highlighting');
    await assertOutlines(page, 'nothing', []);
    assert.equal(await page.locator('#colorRriNodes').inputValue(), '#ff0000');

    await capture.caption('Choose region for RRI nucleotide highlighting');
    await capture.click(select);
    await capture.press('Home');
    await capture.press('Enter', undefined, () => waitForOutlines(page, 'region', allNodes));
    await assertOutlines(page, 'region', allNodes);
    await capture.move({ x: 365, y: 160 });
    await capture.hold(1);
    await capture.caption('Region outlines all 10 nucleotides, including both unpaired A bases');
    await capture.clearCaption();
    await capture.hold(3);

    await capture.caption('Choose basepairs to outline only paired nucleotides');
    await capture.click(select);
    await capture.press('Home');
    await capture.press('ArrowDown');
    await capture.press('Enter', undefined, () => waitForOutlines(page, 'basepairs', pairedNodes));
    await assertOutlines(page, 'basepairs', pairedNodes);
    assert.deepEqual(await page.locator(nucleotide).evaluateAll(nodes =>
      nodes.filter(node => [3, 8].includes(Number(node.getAttribute('node_num'))))
        .map(node => node.parentElement.querySelector('text').textContent)), ['A', 'A']);
    assert.equal(await page.locator('#sequence').inputValue(), 'GGAGG&CCACC');
    assert.equal(await page.locator('#structure').inputValue(), '((.((&)).))');
    await capture.move({ x: 365, y: 160 });
    await capture.hold(1);
    await capture.caption('Basepairs outlines 8 nucleotides; both unpaired A bases lose the red outline');
    await capture.clearCaption();
    await capture.hold(4);
  },
};
