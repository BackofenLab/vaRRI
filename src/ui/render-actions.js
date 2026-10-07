export function createRenderActions({ api, state, actions, document }) {
  let latestRun = 0;
  const target = () => document.getElementById('rendering-canvas');
  function applyColors() {
    const f = state.fields;
    api.setColors({ sequence1: f.colorSeq1, sequence2: f.colorSeq2,
      intermolecularHighlight: f.colorRriNodes, backgroundHighlight: f.colorRriRegion,
      basepair: f.colorBasepair });
  }
  function syncGeneratedRegionHighlight() {
    const existing = api.getRegionHighlights().filter(item => item.generated);
    const remove = () => existing.forEach(item => api.removeRegionHighlight(item.id));
    if (state.fields.backgroundhighlighting !== 'region') { remove(); return; }
    try {
      const v = api.validate({ ...actions.getBaseVisualizationArgs(),
        subsequenceHighlights: [], regionHighlights: [], pointMutations: [] });
      const ranges = api.computeBackgroundRegionRanges(v);
      if (!ranges) { remove(); return; }
      const payload = { ...ranges, color: state.fields.colorRriRegion, generated: true };
      if (existing[0]) api.updateRegionHighlight(existing[0].id, payload, actions.getSequenceContext());
      else api.registerGeneratedRegionHighlight(v, payload);
    } catch { /* Invalid edited input is reported by normal field validation. */ }
  }
  function applySliderRotation() {
    const angle = state.rotation + Number(state.fields.rotationSlider || 0);
    state.rotationPreview = api.normaliseRotationDegrees(angle);
    if (target()?.querySelector('svg')) api.rotateVisualization('rendering-canvas', angle, { mode: 'absolute' });
  }
  function commitSliderRotation() {
    state.rotation = api.normaliseRotationDegrees(state.rotation + Number(state.fields.rotationSlider || 0));
    state.fields.rotationSlider = '0';
    applySliderRotation();
  }
  async function runVisualization() {
    actions.clearMsg();
    applyColors();
    syncGeneratedRegionHighlight();
    actions.syncAnnotations();
    const args = actions.getBaseVisualizationArgs();
    if (!actions.validateFields(args)) return;
    let validated, accessData;
    try { validated = api.validate(args); }
    catch (error) { actions.showMsg(`Validation error: ${error.message}`, 'error'); return; }
    try { accessData = actions.parseProfileAccessData(validated, args); }
    catch (error) { actions.setFieldError(error.fieldId || 'profileData1', error.message); return; }
    const run = ++latestRun;
    const canvas = target();
    canvas.style.visibility = 'hidden';
    const f = state.fields;
    try {
      const result = await api.render('rendering-canvas', validated, {
        onCanvasInteractionChange: summary => { if (run === latestRun) state.canvasInteraction = summary; },
        onTextAnnotationsChange: () => actions.syncAnnotations(),
        forceLayout: f.forceLayout,
        forceLayoutLinearRRI: f.forceLayout && f.forceLayoutLinearRRI,
        forceLayoutLinearStructure: f.forceLayout && f.forceLayoutLinearStructure,
        freeTrailingEnds: f.forceLayout && f.forceLayoutFreeTails,
        pullPseudoknotBasepairs: f.forceLayout && f.forceLayoutPullCrossing,
        accessData,
        accessColors: { sequence1: f.profileColor1, sequence2: f.profileColor2 },
        accessColorMode: { sequence1RepresentsOne: f.profileColorRepresentsOne1,
          sequence2RepresentsOne: f.profileColorRepresentsOne2 },
      });
      if (run !== latestRun || result?.cancelled) return;
      canvas.style.visibility = '';
      actions.syncAnnotations();
      applySliderRotation();
    } catch (error) {
      if (run !== latestRun) return;
      canvas.style.visibility = '';
      actions.syncAnnotations();
      actions.showMsg(`Render error: ${error.message}`, 'error');
    }
  }
  return {
    runVisualization, applyColors, syncGeneratedRegionHighlight, applySliderRotation, commitSliderRotation,
    selectMovedElements() { api.selectManuallyPositionedElements(); },
    resetSelectedPositions() { api.resetSelectedPositions(); },
    releaseSelectedPositions() { api.releaseSelectedPositions(); },
    undoCanvasEdit() { api.undoCanvasEdit(); },
    cancelRendering() {
      latestRun++; api.cancelActiveRender();
      state.canvasInteraction = api.getCanvasInteractionState();
    },
    enableForceLayoutForSelectedLinearOptions() {
      if (state.fields.forceLayoutLinearRRI || state.fields.forceLayoutLinearStructure) state.fields.forceLayout = true;
    },
    syncAnimationDependentControls() {
      if (state.fields.forceLayout) return;
      ['forceLayoutLinearRRI', 'forceLayoutLinearStructure', 'forceLayoutFreeTails', 'forceLayoutPullCrossing']
        .forEach(id => { state.fields[id] = false; });
    },
    exportSVG() {
      try { api.downloadSVG('rendering-canvas', 'vaRRI_output.svg'); }
      catch (error) { actions.showMsg('SVG export error: ' + error.message, 'error'); }
    },
  };
}
