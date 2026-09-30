import { nextTick } from 'vue';

const DRAFTS = { subseq: 'validateSubseqForm', region: 'validateRegionForm', mutation: 'validateMutationForm',
  textAnnotation: 'validateTextAnnotationForm', fasta: 'validateFastaForm' };

export function createFieldActions({ state, actions, document, colors }) {
  const observers = [];
  let disposed = false;
  const skipChange = new Map();
  function updateFromEvent(id, event) {
    const input = event?.target;
    if (input) state.fields[id] = input.type === 'checkbox' ? input.checked : input.value;
  }
  function validateDraft(id) {
    for (const [prefix, method] of Object.entries(DRAFTS)) {
      if (id.startsWith(prefix)) { actions[method]?.(); return true; }
    }
    return false;
  }
  function syncDimensions(id) {
    const input = document.getElementById(id), backdrop = document.getElementById(`backdrop-${id}`);
    if (!input || !backdrop) return;
    backdrop.style.width = `${input.offsetWidth}px`;
    backdrop.style.height = `${input.offsetHeight}px`;
    backdrop.style.paddingRight = `${8 + Math.max(0, input.offsetWidth - input.clientWidth - 2)}px`;
  }
  function syncScroll(id) {
    const input = document.getElementById(id), backdrop = document.getElementById(`backdrop-${id}`);
    if (!input || !backdrop) return;
    backdrop.scrollTop = input.scrollTop; backdrop.scrollLeft = input.scrollLeft;
  }
  function inputField(id, event) {
    updateFromEvent(id, event);
    actions.clearFieldError(id);
    if (id === 'rotationSlider') actions.applySliderRotation();
    else if (id === 'fastaInput') validateDraft(id);
    else if (event?.target?.type !== 'color' && event?.target?.tagName !== 'SELECT') validateDraft(id);
    nextTick(() => { syncDimensions(id); syncScroll(id); });
  }
  function commitField(id, event) {
    updateFromEvent(id, event);
    if (event?.type === 'keydown') skipChange.set(id, state.fields[id]);
    else if (skipChange.has(id)) {
      const previous = skipChange.get(id); skipChange.delete(id);
      if (previous === state.fields[id]) return;
    }
    actions.clearFieldError(id);
    if (id === 'rotationSlider') { actions.commitSliderRotation(); return; }
    if (id === 'hideFooterAndHeader') { actions.applyBodyClasses(); return; }
    if (validateDraft(id)) return;
    if ((id === 'forceLayoutLinearRRI' || id === 'forceLayoutLinearStructure') && state.fields[id]) {
      actions.enableForceLayoutForSelectedLinearOptions();
    }
    if (id.startsWith('forceLayout')) actions.syncAnimationDependentControls();
    actions.runVisualization();
  }
  return {
    inputField, commitField, syncScroll, syncDimensions,
    profileCount() { return ['profileData1', 'profileData2'].filter(id => String(state.fields[id]).trim()).length; },
    highlightSegments(id) {
      const text = String(state.fields[id] || '');
      const separator = text.indexOf('&');
      if (separator < 0) return [{ text: text + (text.endsWith('\n') ? ' ' : '') }];
      const color = (field, alpha) => ({ backgroundColor: colors.cssColorToRGB(state.fields[field], alpha) });
      return [
        { text: text.slice(0, separator), className: 'hl-seq1', style: color('colorSeq1', 0.35) },
        { text: '&', className: 'hl-basepair', style: color('colorBasepair', 0.6) },
        { text: text.slice(separator + 1) + (text.endsWith('\n') ? ' ' : ''), className: 'hl-seq2', style: color('colorSeq2', 0.35) },
      ];
    },
    observeBackdrops() {
      const Observer = document.defaultView.ResizeObserver;
      ['sequence', 'structure', 'fastaSequence', 'fastaStructure'].forEach(id => {
        const input = document.getElementById(id);
        if (Observer && input) {
          const observer = new Observer(() => { syncDimensions(id); syncScroll(id); });
          observer.observe(input); observers.push(observer);
        }
        syncDimensions(id);
      });
    },
    disposeBackdrops() { disposed = true; observers.forEach(observer => observer.disconnect()); },
    dragOver(event) { event.stopPropagation(); event.currentTarget.classList.add('drag-over'); },
    dragLeave(event) { event.currentTarget.classList.remove('drag-over'); },
    dropFile(id, event) {
      event.stopPropagation(); event.currentTarget.classList.remove('drag-over');
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      const reader = new document.defaultView.FileReader();
      reader.onload = () => {
        if (disposed) return;
        state.fields[id] = String(reader.result || '');
        inputField(id); commitField(id);
      };
      reader.readAsText(file);
    },
  };
}
