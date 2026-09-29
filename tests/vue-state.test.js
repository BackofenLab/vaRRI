const { mountViewer } = require('./helpers/vue-viewer.cjs');

test('Vue state remains serializable and does not proxy the visualization API', async () => {
  const viewer = await mountViewer();
  const { isReactive, isProxy } = require('vue');
  expect(isReactive(viewer.view.state)).toBe(true);
  expect(isProxy(viewer.api)).toBe(false);
  const state = JSON.parse(JSON.stringify(viewer.view.state));
  expect(state.fields.sequence).toBe(viewer.examples['2mol'].vaRRIParams.sequence);
  expect(state.annotations.subsequences).toHaveLength(2);
  expect(state.annotations.mutations).toHaveLength(2);
  expect(state).not.toHaveProperty('force');
  expect(state).not.toHaveProperty('canvas');
  const cancelSpy = jest.spyOn(viewer.api, 'cancelActiveRender');
  await viewer.close();
  expect(cancelSpy).toHaveBeenCalled();
});

test.each(['clear', 'unmount'])('%s cancels an example queued for the next Vue update', async action => {
  const viewer = await mountViewer();
  viewer.renderSpy.mockClear();
  const pending = viewer.view.actions.loadExample('wu-2024');
  if (action === 'clear') viewer.view.actions.clearAll();
  else viewer.view.unmount();
  await pending;
  await viewer.flush();
  expect(viewer.renderSpy).not.toHaveBeenCalled();
  if (action === 'clear') {
    expect(viewer.dom.window.document.getElementById('sequence').value).toBe('');
    expect(viewer.view.state.selectedExample).toBeNull();
  } else {
    expect(viewer.dom.window.document.getElementById('app').childElementCount).toBe(0);
  }
  await viewer.close();
});
