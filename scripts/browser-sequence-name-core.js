import assert from 'node:assert/strict';

export async function exerciseCoreSequenceNames(page) {
  const result = await page.evaluate(async () => {
    const api = window.textApi;
    const first = api.getTextAnnotations().find(item => item.sequenceNameFor === '1');
    api.setSequenceNames({ seqName1: 'Custom α' });
    api.refreshTextAnnotations();
    const canvasName = document.querySelector(`[data-varri-text="${first.id}"] text`).textContent;
    api.placeTextAnnotation(first.id, 220, 170);
    api.updateTextAnnotation(first.id, { text: 'Renamed β' });
    const positioned = api.getTextAnnotations().find(item => item.id === first.id);
    // This input predates the edit and omits explicit name overrides.
    await api.render('text-contract', window.textInput);
    const afterRerender = api.getTextAnnotations().find(item => item.id === first.id);
    const names = api.getSequenceNames();
    api.removeTextAnnotation(first.id);
    await api.render('text-contract', window.textInput);
    const unpositioned = api.getTextAnnotations().find(item => item.id === first.id);
    const svgCount = document.querySelectorAll('#text-contract [data-varri-text]').length;
    const second = api.getTextAnnotations().find(item => item.sequenceNameFor === '2');
    await api.render('text-contract', api.validate({ sequence: 'ACGU', structure: '....' }));
    const absent = api.getTextAnnotations().find(item => item.id === second.id);
    const absentSvgCount = document.querySelectorAll('#text-contract [data-varri-text]').length;
    await api.render('text-contract', window.textInput);
    const returned = api.getTextAnnotations().find(item => item.id === second.id);
    const encoded = api.encodeUrlState({ fields: { sequence: 'ACGU&UGCA', structure: '((..&..))',
      ...api.getSequenceNames() }, annotations: { textAnnotations: api.getTextAnnotations() } });
    const decoded = api.decodeUrlState(encoded);
    const host = document.createElement('div');
    host.id = 'restored-names';
    host.style.cssText = 'width:640px;height:480px';
    document.body.appendChild(host);
    const restoredApi = window.testApi.createVaRRI();
    await restoredApi.render(host, restoredApi.validate({ ...decoded.fields,
      textAnnotations: decoded.annotations.textAnnotations }));
    const restored = { names: restoredApi.getSequenceNames(), records: restoredApi.getTextAnnotations(),
      visible: [...host.querySelectorAll('[data-varri-text] text')].map(node => node.textContent) };
    await restoredApi.render(host, restoredApi.validate({ ...decoded.fields, seqName1: 'Explicit URL name',
      textAnnotations: decoded.annotations.textAnnotations }));
    const overridden = restoredApi.getTextAnnotations().find(item => item.sequenceNameFor === '1');
    restoredApi.cancelActiveRender();
    host.remove();
    return { first, canvasName, positioned, names, afterRerender, unpositioned, svgCount,
      second, absent, absentSvgCount, returned, restored, overridden };
  });
  assert.equal(result.canvasName, 'Custom α');
  assert.equal(result.positioned.sequenceNameFor, '1', 'Manual placement retains sequence identity');
  assert.equal(result.positioned.anchor, null);
  assert.equal(result.names.seqName1, 'Renamed β');
  assert.equal(result.afterRerender.text, 'Renamed β', 'Cached validation cannot undo a later rename');
  assert.deepEqual(result.afterRerender.position, result.positioned.position);
  assert.equal(result.unpositioned.id, result.first.id);
  assert.equal(result.unpositioned.position, null);
  assert.equal(result.unpositioned.anchor, null);
  assert.equal(result.svgCount, 1, 'Removing a sequence name only clears its drawing position');
  assert.deepEqual(result.absent.position, result.second.position, 'Absent-strand coordinates are preserved');
  assert.equal(result.absentSvgCount, 0, 'Absent strand labels do not leak into the single-strand SVG');
  assert.equal(result.returned.id, result.second.id);
  assert.ok(result.returned.position);
  assert.equal(result.restored.names.seqName1, 'Renamed β');
  assert.equal(result.restored.records.find(item => item.sequenceNameFor === '1').position, null);
  assert.deepEqual(result.restored.visible, ['Seq. 2']);
  assert.equal(result.overridden.text, 'Explicit URL name');
  assert.equal(result.overridden.position, null, 'Explicit names change text without restoring position');
}
