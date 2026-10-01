import { computed } from 'vue';
import { findBasePairs } from '../core/model/brackets.js';

/** Editing highlights use raw textarea offsets, including strand separators. */
export function createInputHighlights({ state, document, colors }) {
  const editable = id => id === 'sequence' || id === 'structure';
  const partners = computed(() => {
    const pairs = new Map();
    for (const [open, close] of findBasePairs(state.fields.structure)) {
      pairs.set(open, close);
      pairs.set(close, open);
    }
    return pairs;
  });

  function clearInputCaret() {
    state.inputCaret.field = '';
    state.inputCaret.index = -1;
  }

  function updateInputCaret(id, event) {
    if (!editable(id)) return;
    const input = event?.target;
    if (!input) { clearInputCaret(); return; }
    if (document.activeElement !== input) return;
    state.inputCaret.field = id;
    state.inputCaret.index = input.selectionStart === input.selectionEnd ? input.selectionStart - 1 : -1;
  }

  function highlightSegments(id) {
    const text = String(state.fields[id] || '');
    const separator = text.indexOf('&');
    const caret = state.inputCaret;
    const active = editable(id) && caret.field && caret.index < state.fields[caret.field].length
      ? caret.index : -1;
    const partner = active >= 0 ? partners.value.get(active) : undefined;
    const marks = new Map();
    if (active >= 0 && active < text.length) marks.set(active, 'hl-caret');
    if (partner !== undefined && partner < text.length) marks.set(partner, 'hl-partner');

    // Split only at highlight boundaries, keeping long inputs to a few spans.
    const boundaries = new Set([0, text.length]);
    if (separator >= 0) { boundaries.add(separator); boundaries.add(separator + 1); }
    for (const index of marks.keys()) { boundaries.add(index); boundaries.add(index + 1); }
    const offsets = [...boundaries].sort((a, b) => a - b);
    const segments = offsets.slice(0, -1).map((start, index) => {
      const marker = marks.get(start);
      let className = '', style;
      if (separator >= 0) {
        const strand = start < separator ? 1 : start === separator ? 0 : 2;
        className = strand ? `hl-seq${strand}` : 'hl-basepair';
        if (!marker) style = { backgroundColor: colors.cssColorToRGB(
          state.fields[strand ? `colorSeq${strand}` : 'colorBasepair'], strand ? 0.35 : 0.6,
        ) };
      }
      return { text: text.slice(start, offsets[index + 1]),
        className: [className, marker].filter(Boolean).join(' '), style };
    });
    // A final blank line must occupy the same height as in the textarea.
    if (text.endsWith('\n')) segments.push({ text: ' ' });
    return segments;
  }

  return { highlightSegments, updateInputCaret, clearInputCaret };
}
