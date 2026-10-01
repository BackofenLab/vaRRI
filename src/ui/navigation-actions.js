import { nextTick } from 'vue';
import { decodeUrlState, encodeUrlState } from '../core/model/url-state.js';
import { marked } from './vendor/marked.js';

export function createNavigationActions({ api, state, defaults, initialColors, actions, document, examples }) {
  const window = document.defaultView;
  let copiedTimer = null;
  let disposed = false;
  let generation = 0;
  function clearAll() {
    generation++;
    if (copiedTimer !== null) window.clearTimeout(copiedTimer);
    copiedTimer = null;
    state.shareCopied = false;
    actions.cancelRendering();
    state.selectedExample = null;
    state.exampleOpen = false;
    actions.resetFields(Object.keys(defaults));
    actions.resetFastaForm();
    api.clearSubsequenceHighlights(); api.clearRegionHighlights(); api.clearPointMutations();
    api.clearTextAnnotations({ resetDefaults: true });
    api.setSequenceNames({ seq1name: defaults.seq1name, seq2name: defaults.seq2name });
    actions.endTextAnnotationDrag();
    actions.syncAnnotations();
    state.rotation = state.rotationPreview = 0;
    state.showFullPage = false;
    actions.clearAllFieldErrors(); actions.clearMsg();
    const canvas = document.getElementById('rendering-canvas');
    canvas?.replaceChildren();
    if (canvas) canvas.style.visibility = '';
  }
  function applyBodyClasses() {
    document.body.classList.toggle('hide-footer-and-header', state.fields.hideFooterAndHeader);
    document.body.classList.toggle('rendering-only', state.renderingOnly);
  }
  function loadAllUrlParameters(params, { revealProfilePanel = true } = {}) {
    const decoded = decodeUrlState(params, { ...defaults, annotations: {
      mutationColor: defaults.mutationColor, subsequenceColor: defaults.subseqColor,
      regionColor: defaults.regionColor, subsequenceAlpha: Number(defaults.subseqAlpha), regionAlpha: Number(defaults.regionAlpha),
    } });
    Object.entries(decoded.fields).forEach(([key, value]) => {
      if (Object.hasOwn(state.fields, key)) state.fields[key] = Array.isArray(value) ? value.at(-1) : value;
    });
    state.rotation = state.rotationPreview = decoded.rotation;
    if (decoded.showRenderingOnly) state.renderingOnly = state.showFullPage = true;
    const methods = { pointMutations: 'registerPointMutation', subsequenceHighlights: 'registerSubsequenceHighlight', regionHighlights: 'registerRegionHighlight' };
    Object.entries(methods).forEach(([key, method]) => {
      decoded.annotations[key].forEach(item => {
        try { api[method](item, actions.getSequenceContext()); }
        catch (error) { window.console.warn(`Failed to register ${key} from URL: ${error.message}`); }
      });
    });
    if (params.has('textAnnotations')) {
      api.clearTextAnnotations();
      decoded.annotations.textAnnotations.forEach(item => {
        try { api.registerTextAnnotation(item); }
        catch (error) { window.console.warn(`Failed to register textAnnotations from URL: ${error.message}`); }
      });
    }
    const names = Object.fromEntries(['seq1name', 'seq2name'].filter(key => params.has(key))
      .map(key => [key, state.fields[key]]));
    if (Object.keys(names).length) api.setSequenceNames(names);
    actions.syncAnnotations();
    actions.enableForceLayoutForSelectedLinearOptions();
    actions.syncAnimationDependentControls();
    applyBodyClasses();
    if (revealProfilePanel && Object.keys(decoded.fields).some(key => key.startsWith('profileData'))) {
      nextTick(() => { const panel = document.getElementById('profileData1')?.closest('details'); if (panel) panel.open = true; });
    }
  }
  async function loadExample(key) {
    const example = examples[key];
    if (!example?.vaRRIParams) return false;
    api.setColors(initialColors);
    clearAll();
    const selectionGeneration = generation;
    const params = new URLSearchParams();
    Object.entries(example.vaRRIParams).forEach(([key, value]) => {
      if (key !== 'showRenderingOnly' && value !== undefined && value !== null) params.set(key, value);
    });
    loadAllUrlParameters(params, { revealProfilePanel: false });
    actions.resetFastaForm(); actions.resetSubseqForm(); actions.resetRegionForm(); actions.resetMutationForm();
    actions.resetTextAnnotationForm();
    state.selectedExample = key;
    state.exampleOpen = false;
    await nextTick();
    if (disposed || generation !== selectionGeneration) return false;
    document.getElementById('exampleDropdownTrigger')?.focus();
    await actions.runVisualization();
    return true;
  }
  function generateShareableURL() {
    const params = encodeUrlState({ fields: state.fields, rotation: state.rotation,
      annotations: { pointMutations: api.getPointMutations(), subsequenceHighlights: api.getSubsequenceHighlights(),
        regionHighlights: api.getRegionHighlights(), textAnnotations: api.getTextAnnotations() } });
    const base = window.location.href.split('?')[0].split('#')[0];
    return `${base}?${params}`;
  }
  return {
    clearAll, loadAllUrlParameters, loadExample, generateShareableURL, applyBodyClasses,
    closeExamples() { state.exampleOpen = false; document.getElementById('exampleDropdownTrigger')?.focus(); },
    selectedExampleName() { const example = examples[state.selectedExample]; return example?.nameShort || example?.name || 'Select an example'; },
    exampleCaption() {
      const example = examples[state.selectedExample];
      return example?.description ? marked.parse(`**Example** *${example.nameShort}*: ${example.description}`) : '';
    },
    openFullPage() { window.open(generateShareableURL(), '_blank'); },
    async shareLink() {
      const copyGeneration = generation;
      const url = generateShareableURL();
      try {
        await window.navigator.clipboard.writeText(url);
        if (disposed || generation !== copyGeneration) return;
        if (copiedTimer !== null) window.clearTimeout(copiedTimer);
        state.shareCopied = true;
        copiedTimer = window.setTimeout(() => { state.shareCopied = false; copiedTimer = null; }, 2000);
      } catch { if (!disposed && generation === copyGeneration) window.prompt('Copy your shareable URL below:', url); }
    },
    disposeNavigation() {
      disposed = true;
      if (copiedTimer !== null) window.clearTimeout(copiedTimer);
    },
  };
}
