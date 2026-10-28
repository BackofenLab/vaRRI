import assert from 'node:assert/strict';

export default {
  id: 'export-png', title: 'Export a publication PNG', stage: 'export-dialog', zoom: false,
  placements: ['docs:export'],
  parameters: { hideFooterAndHeader: '1' },
  description: 'Set pixel dimensions and print density in the PNG export dialog, then download the image.',
  async run(capture, page) {
    await capture.caption('Open PNG settings');
    await capture.click(page.locator('#exportPngBtn'));
    const before = Number(await page.locator('#pngHeight').inputValue());
    await capture.caption('Width keeps the aspect ratio');
    await capture.hold(0.4);
    await capture.fill(page.locator('#pngWidth'), '1200');
    const height = Number(await page.locator('#pngHeight').inputValue());
    assert.notEqual(height, before);
    await capture.caption('DPI sets print density');
    await capture.hold(0.2);
    await capture.fill(page.locator('#pngDpi'), '300');
    assert.equal(await page.locator('#pngWidth').inputValue(), '1200');
    const downloadPromise = page.waitForEvent('download');
    await capture.caption('Export PNG starts the browser download');
    await capture.click(page.locator('#pngExportDialog button[value="ok"]'));
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'vaRRI_output.png');
    await capture.move({ x: 80, y: 140 });
    await capture.hold(1.2);
  },
};
