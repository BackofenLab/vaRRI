import assert from 'node:assert/strict';
import { exerciseCoreSequenceNames } from './browser-sequence-name-core.js';

/** The same annotation contract is exercised against native and bundled APIs. */
export async function exerciseCoreTextAnnotations(page) {
  await page.evaluate(async () => {
    const { createGraphCanvas } = await import('/src/core/canvas/graph/index.js');
    const host = document.createElement('div');
    host.id = 'text-contract';
    host.style.cssText = 'width:640px;height:480px';
    document.body.prepend(host);
    const api = window.testApi.createVaRRI({ createCanvas(target, options) {
      window.textContainer = createGraphCanvas(target, options);
      return window.textContainer;
    } });
    window.textApi = api;
    window.textInput = api.validate({ sequence: 'ACGU&UGCA', structure: '((..&..))',
      highlighting: 'nothing', backgroundhighlighting: 'nothing' });
    await api.render('text-contract', window.textInput, { forceLayout: true });
    window.textContainer.force.stop();
  });
  const host = page.locator('#text-contract');
  assert.deepEqual(await host.locator('[data-varri-text] text').allTextContents(), ['Seq. 1', 'Seq. 2']);
  const initial = await page.evaluate(() => ({
    labels: window.textApi.getTextAnnotations(),
    count: window.textContainer.graph.nodes.length,
  }));
  assert.ok(initial.labels.every(item => item.position && item.anchor), 'Default labels have endpoint anchors');

  // A rigid translation should move every label, including freely positioned ones.
  const movement = await page.evaluate(() => {
    const api = window.textApi;
    const manual = api.registerTextAnnotation({ text: 'Free <&> α', bold: true,
      italic: true, size: 14, color: '#123456', position: { x: 15, y: -20 } });
    api.registerTextAnnotation({ text: 'Waiting', position: null });
    api.refreshTextAnnotations();
    window.manualTextId = manual.id;
    const point = id => {
      const group = document.querySelector(`#text-contract [data-varri-text="${id}"]`);
      const matrix = group.getCTM();
      return { x: matrix.e, y: matrix.f, scale: Math.hypot(matrix.a, matrix.b) };
    };
    const before = api.getTextAnnotations().filter(item => item.position).map(item => point(item.id));
    for (const node of window.textContainer.graph.nodes) {
      node.x += 32; node.px = node.x;
      node.y -= 17; node.py = node.y;
      node.fixed = 1;
      node.vx = node.vy = 0;
    }
    window.textContainer.force.alpha(0.1).tick();
    const after = api.getTextAnnotations().filter(item => item.position).map(item => point(item.id));
    return { before, after, manual: api.getTextAnnotations().find(item => item.id === manual.id),
      nodeCount: window.textContainer.graph.nodes.length };
  });
  assert.equal(movement.nodeCount, initial.count, 'Text does not join the force graph');
  assert.deepEqual(movement.manual.position, { x: 15, y: -20 }, 'Force drift does not rewrite persisted positions');
  movement.before.forEach((before, index) => {
    const after = movement.after[index];
    assert.ok(Math.abs((after.x - before.x) / before.scale - 32) < 0.01, 'Label follows graph translation x');
    assert.ok(Math.abs((after.y - before.y) / before.scale + 17) < 0.01, 'Label follows graph translation y');
  });
  assert.equal(await host.locator('[data-varri-text]').count(), 3, 'Null-position label stays hidden');

  await page.evaluate(() => window.textApi.rotateVisualization('text-contract', 57, { mode: 'absolute' }));
  const annotation = host.locator('[data-varri-text]').last();
  const label = annotation.locator('text');
  const style = await label.evaluate(element => {
    const computed = getComputedStyle(element), matrix = element.getScreenCTM();
    return { text: element.textContent, weight: computed.fontWeight, italic: computed.fontStyle,
      fill: computed.fill, angle: Math.atan2(matrix.b, matrix.a) };
  });
  assert.equal(style.text, 'Free <&> α');
  assert.equal(style.weight, '700');
  assert.equal(style.italic, 'italic');
  assert.equal(style.fill, 'rgb(18, 52, 86)');
  assert.ok(Math.abs(style.angle) < 0.001, 'Annotation stays horizontal after rotation');

  // Client placement must invert both the display rotation and current zoom.
  const target = await host.boundingBox();
  const client = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  await page.evaluate(({ x, y }) => window.textApi.placeTextAnnotation(window.manualTextId, x, y), client);
  const placed = await annotation.evaluate(element => {
    const matrix = element.getScreenCTM();
    return { x: matrix.e, y: matrix.f };
  });
  assert.ok(Math.hypot(placed.x - client.x, placed.y - client.y) < 0.1, 'Client placement lands on requested screen point');

  // Actual pointer drag uses the existing grab offset and must not pan the RNA.
  const box = await label.boundingBox();
  const plotBefore = await host.locator('.fornac-plot').getAttribute('transform');
  const pointer = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.down();
  await page.mouse.move(pointer.x + 42, pointer.y + 23, { steps: 5 });
  await page.mouse.up();
  const dragged = await annotation.evaluate(element => {
    const matrix = element.getScreenCTM();
    return { x: matrix.e, y: matrix.f };
  });
  assert.ok(Math.abs(dragged.x - placed.x - 42) < 0.5, 'Rotated dragging follows pointer x');
  assert.ok(Math.abs(dragged.y - placed.y - 23) < 0.5, 'Rotated dragging follows pointer y');
  assert.equal(await host.locator('.fornac-plot').getAttribute('transform'), plotBefore, 'Label drag does not pan the RNA');

  const exported = await page.evaluate(() => window.textApi.buildSVGString('text-contract'));
  assert.ok(exported.includes('Free &lt;&amp;&gt; α') && exported.includes('font-weight:700'), 'Export preserves literal text and font');
  assert.ok(!exported.includes('Waiting'), 'Unpositioned labels are absent from exported SVG');
  const beforeRerender = await page.evaluate(() => window.textApi.getTextAnnotations());
  await page.evaluate(async () => { await window.textApi.render('text-contract', window.textInput); });
  assert.deepEqual(await page.evaluate(() => window.textApi.getTextAnnotations().find(item => item.id === window.manualTextId).position),
    beforeRerender.find(item => item.id === movement.manual.id).position, 'Rerender preserves relative position');

  // Releasing a default clears its endpoint anchor but keeps its name identity.
  await page.evaluate(() => window.textApi.placeTextAnnotation(1, 230, 210));
  assert.ok(!await page.evaluate(() => window.textApi.getTextAnnotations()[0].anchor), 'Moving default releases its endpoint anchor');
  const activeLabel = host.locator('[data-varri-text] text').first();
  const activeBox = await activeLabel.boundingBox();
  await page.mouse.move(activeBox.x + activeBox.width / 2, activeBox.y + activeBox.height / 2);
  await page.mouse.down();
  await page.evaluate(() => window.textApi.cancelActiveRender());
  const cancelled = await page.evaluate(() => window.textApi.getTextAnnotations());
  await page.mouse.move(activeBox.x + 70, activeBox.y + 60);
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.textApi.getTextAnnotations()), cancelled, 'Cancellation detaches active annotation drag');
  await page.evaluate(async () => {
    window.textApi.clearTextAnnotations();
    await window.textApi.render('text-contract', window.textInput);
  });
  assert.equal(await host.locator('[data-varri-text]').count(), 0, 'Explicit clear survives rerender');
  await page.evaluate(async () => {
    window.textApi.clearTextAnnotations({ resetDefaults: true });
    await window.textApi.render('text-contract', window.textApi.validate({ sequence: 'A', structure: '.' }));
  });
  assert.deepEqual(await host.locator('[data-varri-text] text').allTextContents(), ['Seq. 1']);
  const singleBox = await host.locator('[data-varri-text-bar]').boundingBox();
  const singleHost = await host.boundingBox();
  assert.ok(singleBox.x >= singleHost.x && singleBox.y >= singleHost.y &&
    singleBox.x + singleBox.width <= singleHost.x + singleHost.width &&
    singleBox.y + singleBox.height <= singleHost.y + singleHost.height, 'Default label fits a one-nucleotide figure');
  for (const length of [1, 2, 3, 4]) {
    await page.evaluate(async length => {
      window.textApi.clearTextAnnotations({ resetDefaults: true });
      const input = window.textApi.validate({ sequence: 'A'.repeat(length), structure: '.'.repeat(length) });
      await window.textApi.render('text-contract', input);
    }, length);
    const bounds = await host.evaluate(element => {
      const box = node => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      };
      return { host: box(element), bar: box(element.querySelector('[data-varri-text-bar]')),
        indices: [...element.querySelectorAll('text[label_type="label"]')].map(box) };
    });
    const { bar, host: viewport } = bounds;
    assert.ok(bar.x >= viewport.x && bar.y >= viewport.y &&
      bar.x + bar.width <= viewport.x + viewport.width && bar.y + bar.height <= viewport.y + viewport.height,
    `Default label fits a ${length}-nucleotide figure`);
    assert.ok(bounds.indices.every(index => bar.x + bar.width <= index.x || index.x + index.width <= bar.x ||
      bar.y + bar.height <= index.y || index.y + index.height <= bar.y),
    `Default label does not obscure indices in a ${length}-nucleotide figure`);
    await host.screenshot({ path: `output/playwright/core-contract/text-default-${length}.png` });
  }
  await page.evaluate(async () => { await window.textApi.render('text-contract', window.textInput); });
  assert.deepEqual(await host.locator('[data-varri-text] text').allTextContents(), ['Seq. 1', 'Seq. 2'],
    'Adding a second strand introduces its default');
  await exerciseCoreSequenceNames(page);
  await page.evaluate(() => {
    window.textApi.cancelActiveRender();
    document.getElementById('text-contract').remove();
  });
}
