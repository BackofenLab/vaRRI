import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { crc32 } from 'node:zlib';
import { createCanvas, loadImage } from 'canvas';

async function dimensions(page) {
  return page.locator('#rendering-canvas svg').evaluate(svg => [svg.clientWidth, svg.clientHeight]);
}

export async function checkPNGDialog(page, output) {
  let downloads = 0;
  const count = () => { downloads++; };
  page.on('download', count);
  try {
    const [width, height] = await dimensions(page);
    await page.locator('#exportPngBtn').click();
    const dialog = page.getByRole('dialog', { name: 'Export PNG', exact: true });
    assert.equal(await dialog.isVisible(), true);
    assert.equal(await page.locator('#pngWidth').inputValue(), String(width));
    assert.equal(await page.locator('#pngHeight').inputValue(), String(height));
    assert.equal(await page.locator('#pngDpi').inputValue(), '96');
    await page.locator('#pngWidth').fill(String(width * 2));
    assert.equal(await page.locator('#pngHeight').inputValue(), String(height * 2));
    await page.locator('#pngHeight').fill(String(height * 3));
    assert.equal(await page.locator('#pngWidth').inputValue(), String(width * 3));
    await page.locator('#pngWidth').fill('');
    await dialog.getByRole('button', { name: 'Export PNG', exact: true }).click();
    assert.equal(await page.locator('#pngWidth').evaluate(input => input.validity.valueMissing), true);
    assert.equal(await dialog.isVisible(), true);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    assert.equal(await dialog.isVisible(), false);
    assert.equal(downloads, 0);

    await page.locator('#exportPngBtn').click();
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), false);
    assert.equal(downloads, 0);

    await page.locator('#exportPngBtn').click();
    await page.locator('#pngWidth').fill(String(width * 2));
    await page.locator('#pngDpi').fill('0');
    await dialog.getByRole('button', { name: 'Export PNG', exact: true }).click();
    assert.equal(await page.locator('#pngDpi').evaluate(input => input.validity.rangeUnderflow), true);
    assert.equal(downloads, 0);
    await page.locator('#pngDpi').fill('300');
    assert.equal(await page.locator('#pngWidth').inputValue(), String(width * 2));
    await page.screenshot({ path: path.join(output, 'png-export-dialog.png') });
    const [download] = await Promise.all([page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Export PNG', exact: true }).click()]);
    assert.equal(download.suggestedFilename(), 'vaRRI_output.png');
    const target = path.join(output, 'viewer.png');
    await download.saveAs(target);
    assert.equal(await download.failure(), null);
    const bytes = fs.readFileSync(target);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), width * 2);
    assert.equal(bytes.readUInt32BE(20), height * 2);
    const types = [];
    for (let offset = 8; offset < bytes.length;) {
      const size = bytes.readUInt32BE(offset);
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      types.push(type);
      assert.equal(bytes.readUInt32BE(offset + 8 + size), crc32(bytes.subarray(offset + 4, offset + 8 + size)));
      if (type === 'pHYs') {
        assert.equal(bytes.readUInt32BE(offset + 8), 11811, '300 DPI in pixels per metre');
        assert.equal(bytes.readUInt32BE(offset + 12), 11811);
        assert.equal(bytes[offset + 16], 1);
      }
      offset += size + 12;
    }
    assert.equal(types.filter(type => type === 'pHYs').length, 1);
    assert.ok(types.indexOf('pHYs') < types.indexOf('IDAT'));
    const image = await loadImage(target);
    const context = createCanvas(image.width, image.height).getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    assert.deepEqual(Array.from(pixels.subarray(0, 4)), [255, 255, 255, 255], 'White background');
    assert.ok(pixels.some((value, index) => index % 4 !== 3 && value < 200), 'Export includes the visualization');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(downloads, 1);
  } finally { page.off('download', count); }
}

export async function checkPNGResize(page, output) {
  await page.setViewportSize({ width: 390, height: 844 });
  // Wait for the SVG's ResizeObserver to follow the resized container.
  await page.waitForFunction(() => {
    const canvas = document.getElementById('rendering-canvas');
    return canvas.querySelector('svg').clientWidth === canvas.clientWidth;
  });
  const [width, height] = await dimensions(page);
  await page.locator('#exportPngBtn').click();
  assert.equal(await page.locator('#pngWidth').inputValue(), String(width));
  assert.equal(await page.locator('#pngHeight').inputValue(), String(height));
  const dialog = page.getByRole('dialog', { name: 'Export PNG', exact: true });
  const box = await dialog.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390, 'Dialog fits the narrow viewport');
  await page.screenshot({ path: path.join(output, 'png-export-mobile.png') });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
}
