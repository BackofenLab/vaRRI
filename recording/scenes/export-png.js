import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function checkPNG(download, width, height, dpi) {
  assert.equal(download.suggestedFilename(), 'vaRRI_output.png');
  assert.equal(await download.failure(), null, 'PNG download completes successfully');
  const bytes = await fs.readFile(await download.path());
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
  assert.equal(bytes.readUInt32BE(16), width);
  assert.equal(bytes.readUInt32BE(20), height);
  let density;
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString('ascii', offset + 4, offset + 8) === 'pHYs') {
      density = bytes.subarray(offset + 8, offset + 8 + length);
    }
    offset += length + 12;
  }
  assert.ok(density, 'PNG includes print-density metadata');
  assert.equal(density.readUInt32BE(0), Math.round(dpi / 0.0254));
  assert.equal(density.readUInt32BE(4), Math.round(dpi / 0.0254));
  assert.equal(density[8], 1, 'PNG density is measured in pixels per metre');
}

export default {
  id: 'export-png', title: 'Export a publication PNG', stage: 'export-dialog', zoom: false,
  placements: ['docs:export'],
  parameters: { hideFooterAndHeader: '1' },
  description: 'Set pixel dimensions and print density in the PNG export dialog, then download the image.',
  async run(capture, page) {
    await capture.caption('Click PNG to choose image size and print density');
    await capture.click(page.locator('#exportPngBtn'));
    await page.locator('#pngExportDialog').waitFor({ state: 'visible' });
    const originalWidth = Number(await page.locator('#pngWidth').inputValue());
    const before = Number(await page.locator('#pngHeight').inputValue());
    await capture.caption('Set width to 1200 pixels; height follows the aspect ratio');
    await capture.fill(page.locator('#pngWidth'), '1200');
    const height = Number(await page.locator('#pngHeight').inputValue());
    assert.notEqual(height, before);
    assert.ok(Math.abs(height - 1200 * before / originalWidth) <= 1);
    await capture.hold(0.8);
    await capture.caption('Set DPI to 300; the pixel dimensions stay the same');
    await capture.fill(page.locator('#pngDpi'), '300');
    assert.equal(await page.locator('#pngWidth').inputValue(), '1200');
    assert.equal(Number(await page.locator('#pngHeight').inputValue()), height);
    assert.equal(await page.locator('#pngDpi').inputValue(), '300');
    await capture.hold(0.8);
    const downloadPromise = page.waitForEvent('download');
    await capture.caption('Click Export PNG to download the image');
    await capture.click(page.locator('#pngExportDialog button[value="ok"]'));
    const download = await downloadPromise;
    await checkPNG(download, 1200, height, 300);
    await page.locator('#pngExportDialog').waitFor({ state: 'hidden' });
    await capture.move({ x: 80, y: 140 });
    await capture.caption(`PNG downloaded: 1200 × ${height} pixels at 300 DPI`);
    await capture.clearCaption();
    await capture.hold(1.5);
  },
};
