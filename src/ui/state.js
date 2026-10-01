import { reactive } from 'vue';

export function createViewerState(api, colors) {
  const palette = api.getColors();
  const hex = colors.cssColorToHex;
  const defaults = {
    sequence: '', structure: '', startIndex1: '1', startIndex2: '1',
    rotationSlider: '0', cropping: '-1', colorSeq1: hex(palette.sequence1),
    colorSeq2: hex(palette.sequence2), coloring: 'strand', highlighting: 'region',
    backgroundhighlighting: 'basepairs', distinctBpTypes: true,
    profileData1: '', profileIdxRef1: '1', profileColor1: hex(palette.seq1profileColor),
    profileColorRepresentsOne1: true, profileData2: '', profileIdxRef2: '1',
    profileColor2: hex(palette.seq2profileColor), profileColorRepresentsOne2: true,
    forceLayout: false, forceLayoutFreeTails: false, forceLayoutPullCrossing: false,
    forceLayoutLinearStructure: false, forceLayoutLinearRRI: false,
    hideFooterAndHeader: false, colorRriNodes: hex(palette.intermolecularHighlight),
    colorRriRegion: hex(palette.backgroundHighlight), colorBasepair: hex(palette.basepair),
    subseqEditId: '', subseqSequence: '1', subseqRange: '',
    subseqColor: hex(palette.subsequenceHighlight), subseqAlpha: '0.3',
    regionEditId: '', region1: '', region2: '',
    regionColor: hex(palette.backgroundHighlight), regionAlpha: '0.2',
    mutationEditId: '', mutationSequence: '1', mutationPosition: '', mutationBase: '',
    mutationColor: hex(palette.mutationColor),
    fastaInput: '', fastaSequence: '', fastaStructure: '',
  };
  const state = reactive({
    fields: { ...defaults }, errors: {}, message: { text: '', type: '' },
    annotations: { subsequences: [], regions: [], mutations: [] },
    selectedExample: null, exampleOpen: false, rotation: 0, rotationPreview: 0,
    renderingOnly: false, showFullPage: false, shareCopied: false,
    inputCaret: { field: '', index: -1 },
    dialog: { id: '', title: '', value: '', left: '', top: '' },
  });
  return { state, defaults, initialColors: palette };
}

export function createStateActions({ state, defaults, api }) {
  return {
    setFieldError(id, message) { state.errors[id] = message; },
    clearFieldError(id) { delete state.errors[id]; },
    clearFieldErrors(ids) { ids.forEach(id => { delete state.errors[id]; }); },
    clearAllFieldErrors() { Object.keys(state.errors).forEach(id => { delete state.errors[id]; }); },
    resetFields(ids) {
      (Array.isArray(ids) ? ids : [ids]).forEach(id => {
        if (id === 'hideFooterAndHeader') return;
        state.fields[id] = defaults[id] ?? '';
        delete state.errors[id];
      });
    },
    showMsg(text, type) { state.message = { text, type }; },
    clearMsg() { state.message = { text: '', type: '' }; },
    syncAnnotations() {
      state.annotations.subsequences = api.getSubsequenceHighlights();
      state.annotations.regions = api.getRegionHighlights();
      state.annotations.mutations = api.getPointMutations();
    },
  };
}
