import assert from 'node:assert/strict';
import { ready } from './helpers.js';

const fasta = '>First RNA\nACGU\n((..\n>Second RNA\nUGCA\n..))';

export default {
  id: 'import-fasta', title: 'Import FASTA input', stage: 'dialog', zoom: false,
  placements: ['docs:fasta-input'],
  parameters: { hideFooterAndHeader: '1', sequence: 'ACGU&UGCA', structure: '((..&..))' },
  description: 'Paste two FASTA records, inspect the parsed sequences, structures, and names, then render them.',
  async run(capture, page) {
    await capture.caption('Open the FASTA input dialog');
    await capture.click(page.locator('#fastaInputBtn'));
    await capture.caption('Paste FASTA records');
    await capture.fill(page.locator('#fastaInput'), fasta);
    await page.waitForFunction(() => document.getElementById('fastaSequence')?.value === 'ACGU&UGCA');
    assert.equal(await page.locator('#fastaStructure').inputValue(), '((..&..))');
    await capture.caption('Parsed names and structures are ready to use');
    await capture.hold(0.9);
    await capture.click(page.locator('#fastaDialog button[value="ok"]'));
    await ready(page);
    assert.equal(await page.locator('#seqName1').inputValue(), 'First');
    assert.equal(await page.locator('#seqName2').inputValue(), 'Second');
    await capture.caption('OK renders the imported RNA');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.1);
  },
};
