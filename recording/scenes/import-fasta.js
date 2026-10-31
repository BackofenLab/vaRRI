import assert from 'node:assert/strict';
import { ready } from './helpers.js';

const fasta = '>First RNA\nACGU\n((..\n>Second RNA\nUGGU\n..))';

export default {
  id: 'import-fasta', title: 'Import FASTA input', stage: 'dialog', zoom: false,
  placements: ['docs:fasta-input'],
  parameters: { hideFooterAndHeader: '1', sequence: 'AAAAAA&UUUUUU', structure: '......&......' },
  description: 'Paste two FASTA records, inspect the parsed sequences, structures, and names, then render them.',
  async run(capture, page) {
    await capture.caption('Open FASTA Data to import RNA records');
    await capture.click(page.locator('#fastaInputBtn'));
    assert.equal(await page.locator('#fastaDialog').evaluate(dialog => dialog.open), true);
    await capture.caption('Paste two FASTA records with sequences and structures');
    await capture.paste(page.locator('#fastaInput'), fasta);
    await page.waitForFunction(() => document.getElementById('fastaSequence')?.value === 'ACGU&UGGU');
    assert.equal(await page.locator('#fastaInput').inputValue(), fasta);
    assert.equal(await page.locator('#fastaStructure').inputValue(), '((..&..))');
    assert.equal(await page.locator('#fastaSeqName1').inputValue(), 'First');
    assert.equal(await page.locator('#fastaSeqName2').inputValue(), 'Second');
    await capture.caption('Check the parsed sequences, structures, and names');
    await capture.clearCaption();
    await capture.move({ x: 130, y: 300 });
    await capture.hold(2.2);
    await capture.caption('Click OK to render the imported RNA');
    await capture.click(page.locator('#fastaDialog button[value="ok"]'));
    await ready(page);
    await page.waitForFunction(() =>
      document.querySelectorAll('#rendering-canvas circle[node_type="nucleotide"]').length === 8);
    assert.equal(await page.locator('#fastaDialog').evaluate(dialog => dialog.open), false);
    assert.equal(await page.locator('#sequence').inputValue(), 'ACGU&UGGU');
    assert.equal(await page.locator('#structure').inputValue(), '((..&..))');
    assert.equal(await page.locator('#seqName1').inputValue(), 'First');
    assert.equal(await page.locator('#seqName2').inputValue(), 'Second');
    assert.deepEqual(await page.locator('#rendering-canvas [data-varri-text] text').allTextContents(),
      ['First', 'Second']);
    assert.equal(await page.locator('#rendering-canvas line').evaluateAll(lines =>
      lines.filter(line => ['basepair', 'pseudoknot'].includes(line.__data__?.linkType)).length), 2);
    await capture.move({ x: 80, y: 140 });
    await capture.hold(2.5);
  },
};
