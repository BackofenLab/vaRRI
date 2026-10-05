import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

export async function exerciseTextAnnotationUI(page, origin, output) {
  const params = new URLSearchParams({ sequence: 'ACGU&UGCA', structure: '((..&..))',
    highlighting: 'nothing', backgroundhighlighting: 'nothing', forceLayout: '0' });
  const ready = () => page.waitForFunction(() =>
    document.querySelector('#rendering-canvas [data-varri-text]') &&
    document.getElementById('rendering-canvas').style.visibility !== 'hidden');
  const open = async () => {
    const panel = page.locator('#textAnnotationSubmitBtn').locator('xpath=ancestor::details[1]');
    if (!await panel.evaluate(element => element.open)) await panel.locator('summary').click();
  };
  await page.goto(`${origin}/index.html?${params}`, { waitUntil: 'networkidle' });
  await ready();
  await open();
  assert.deepEqual(await page.locator('#rendering-canvas [data-varri-text] text').allTextContents(), ['Seq. 1', 'Seq. 2']);
  assert.equal(await page.locator('#text-annotation-list [aria-label="Positioned"]').count(), 2);
  await page.screenshot({ path: path.join(output, 'text-defaults.png'), fullPage: true });

  const content = 'Binding α: <seed> & tail';
  await page.locator('#textAnnotationSubmitBtn').click();
  await page.locator('#textAnnotationText').fill(content);
  await page.locator('#textAnnotationBold').check();
  await page.locator('#textAnnotationItalic').check();
  await page.locator('#textAnnotationSize').fill('10');
  await page.locator('#textAnnotationColor').fill('#173c8f');
  await page.locator('#textAnnotationDialog button[value="ok"]').click();
  const item = page.locator('.text-annotation-item').filter({ hasText: content });
  const preview = item.locator('.text-annotation-preview');
  assert.equal(await item.locator('[aria-label="Unpositioned"]').count(), 1);
  assert.equal(await page.locator('#rendering-canvas [data-varri-text]').count(), 2);
  const id = await item.getAttribute('data-text-annotation-id');

  // Rotate and zoom before the HTML drag/drop, so a raw screen-coordinate bug fails.
  await page.evaluate(async () => {
    const { default: view } = await import('/index.js');
    view.state.rotation = 43;
    view.actions.applySliderRotation();
  });
  const svg = page.locator('#rendering-canvas svg');
  const zoomBefore = await svg.evaluate(element => element.__zoom.k);
  await svg.hover({ position: { x: 100, y: 100 } });
  await page.mouse.wheel(0, -100);
  await page.waitForFunction(previous => document.querySelector('#rendering-canvas svg').__zoom.k > previous, zoomBefore);
  await page.waitForTimeout(200);
  await preview.dragTo(page.locator('#rendering-canvas'), { targetPosition: { x: 230, y: 170 } });
  await page.waitForFunction(id => document.querySelector(`[data-text-annotation-id="${id}"] [aria-label="Positioned"]`), id);
  const group = page.locator(`#rendering-canvas [data-varri-text="${id}"]`);
  const canvasBox = await page.locator('#rendering-canvas').boundingBox();
  const placed = await group.evaluate(element => {
    const matrix = element.getScreenCTM();
    const textMatrix = element.querySelector('text').getScreenCTM();
    return { x: matrix.e, y: matrix.f, angle: Math.atan2(textMatrix.b, textMatrix.a) };
  });
  assert.ok(Math.hypot(placed.x - canvasBox.x - 230, placed.y - canvasBox.y - 170) < 2, 'Dropped text lands at rotated/zoomed drop point');
  assert.ok(Math.abs(placed.angle) < 0.001, 'Text added after rotation stays horizontal');
  assert.equal(await preview.getAttribute('draggable'), 'false');

  const plotBefore = await page.locator('#rendering-canvas .fornac-plot').getAttribute('transform');
  const textBox = await group.locator('text').boundingBox();
  await page.mouse.move(textBox.x + textBox.width / 2, textBox.y + textBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(textBox.x + textBox.width / 2 + 50, textBox.y + textBox.height / 2 + 30, { steps: 6 });
  await page.mouse.up();
  const moved = await group.evaluate(element => {
    const matrix = element.getScreenCTM();
    return { x: matrix.e, y: matrix.f };
  });
  assert.ok(Math.abs(moved.x - placed.x - 50) < 1 && Math.abs(moved.y - placed.y - 30) < 1, 'SVG drag follows pointer with force disabled');
  assert.equal(await page.locator('#rendering-canvas .fornac-plot').getAttribute('transform'), plotBefore);

  // A mixed group must notify Vue with the final centroid-relative text position.
  const nodePoint = await page.locator('#rendering-canvas circle[node_type="nucleotide"]').evaluateAll(elements => {
    for (const element of elements) {
      const box = element.getBoundingClientRect();
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      if (document.elementFromPoint(point.x, point.y)?.closest('g.gnode') === element.parentElement) return point;
    }
    return null;
  });
  assert.ok(nodePoint, 'A nucleotide is available for mixed selection');
  const selectedText = await group.locator('text').boundingBox();
  const handle = { x: selectedText.x + selectedText.width / 2, y: selectedText.y + selectedText.height / 2 };
  await page.keyboard.down('Control');
  await page.mouse.click(nodePoint.x, nodePoint.y);
  await page.mouse.click(handle.x, handle.y);
  await page.keyboard.up('Control');
  assert.equal(await page.locator('#rendering-canvas [data-varri-selected]').count(), 2);
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 16, handle.y - 10, { steps: 4 });
  await page.mouse.up();
  const groupPosition = await page.evaluate(async id => {
    const { default: view } = await import('/index.js');
    return view.state.annotations.texts.find(item => item.id === Number(id)).position;
  }, id);

  await preview.click();
  await page.locator('#textAnnotationText').fill(content + ' edited');
  await page.locator('#textAnnotationDialog button[value="ok"]').click();
  assert.equal(await group.locator('text').textContent(), content + ' edited');
  const shared = await page.evaluate(async () => {
    const { default: view } = await import('/index.js');
    return view.actions.generateShareableURL();
  });
  const saved = JSON.parse(new URL(shared).searchParams.get('textAnnotations'));
  assert.equal(saved.length, 3);
  assert.equal(saved[2].text, content + ' edited');
  assert.equal(saved[2].bold, true);
  assert.equal(saved[2].italic, true);
  assert.equal(saved[2].size, 10);
  assert.deepEqual(saved[2].position, groupPosition, 'Share link saves the grouped drag position');
  assert.ok(!saved[2].anchor);
  await page.goto(shared, { waitUntil: 'networkidle' });
  await ready();
  await open();
  assert.equal(await page.locator('#rendering-canvas [data-varri-text]').count(), 3);
  const restored = await page.evaluate(async () => {
    const { default: view } = await import('/index.js');
    return view.state.annotations.texts.at(-1);
  });
  assert.deepEqual(restored.position, saved[2].position);
  assert.equal(restored.text, content + ' edited');
  await page.screenshot({ path: path.join(output, 'text-annotations-ui.png'), fullPage: true });
  for (const extension of ['svg', 'png']) {
    if (extension === 'png') await page.locator('#exportPngBtn').click();
    const [download] = await Promise.all([page.waitForEvent('download'),
      page.locator(extension === 'svg' ? '#exportSvgBtn' : '#pngExportDialog button[value="ok"]').click()]);
    const destination = path.join(output, 'text-annotations.' + extension);
    await download.saveAs(destination);
    const bytes = fs.readFileSync(destination);
    if (extension === 'svg') assert.ok(bytes.toString().includes('Binding α: &lt;seed&gt; &amp; tail edited'));
    else assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  }

  await page.locator('#textAnnotationClearAllBtn').click();
  assert.equal(await page.locator('#rendering-canvas [data-varri-text]').count(), 0);
  const cleared = await page.evaluate(async () => {
    const { default: view } = await import('/index.js');
    await view.actions.runVisualization();
    return view.actions.generateShareableURL();
  });
  const clearedRecords = JSON.parse(new URL(cleared).searchParams.get('textAnnotations'));
  assert.deepEqual(clearedRecords.map(item => item.sequenceNameFor).sort(), ['1', '2']);
  assert.ok(clearedRecords.every(item => item.position === null));
  await page.goto(cleared, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#rendering-canvas [data-varri-text]').count(), 0, 'Cleared defaults stay cleared after share restoration');
  assert.equal(await page.locator('#text-annotation-list .text-annotation-item').count(), 2,
    'Clearing removes user labels while retaining both unpositioned sequence names');
}
