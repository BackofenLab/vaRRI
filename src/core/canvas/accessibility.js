

/**
 * Add an accessibility-overlay circle on top of an existing node.
 *
 * @param {number} id   Node ID.
 * @param {string} style  CSS style for the overlay.
 * @param {string} tooltip  Extra tooltip text to append.
 */
export function addAccessibilityOverlay(session, id, style, tooltip) {
  session.dom.querySelectorAll(`circle[node_num="${id}"]`).forEach(node => {
    const overlay = node.cloneNode(true);
    overlay.setAttribute('node_num', `o${id}`);
    overlay.setAttribute('style', style);
    if (overlay.firstChild) {
      overlay.firstChild.innerHTML += tooltip;
    }
    node.after(overlay);
  });
}

/**
 * Map a probability value to an opacity (higher probability → lower opacity).
 *
 * @param {number} prb  Value in [0, 1].
 * @returns {number}
 */
export function mapProbabilityToOpacity(prb, representsOne) {
  return representsOne ? prb : 1 - prb;
}

/**
 * Visualise nucleotide accessibility data as overlaid coloured circles.
 *
 * @param {Object.<number, number>} accessData  Map of node ID → accessibility probability.
 * @param {number} lenSeq  Length of sequence 1 (used to distinguish colour by molecule).
 * @param {{sequence1?: string, sequence2?: string}|null} accessColors  Optional colors for sequence 1/2 overlays.
 * @param {{sequence1RepresentsOne?: boolean, sequence2RepresentsOne?: boolean}|null} accessColorMode
 *     Optional per-sequence mapping flags. If true, probability 1 maps to full color.
 */
export function visualiseAccessibility(session, accessData, lenSeq, accessColors = null, accessColorMode = null) {
  const seq1Color = accessColors?.sequence1 || session.colors.seq1profileColor;
  const seq2Color = accessColors?.sequence2 || session.colors.seq2profileColor;
  const seq1RepresentsOne = !!accessColorMode?.sequence1RepresentsOne;
  const seq2RepresentsOne = !!accessColorMode?.sequence2RepresentsOne;
  for (const [indexStr, prb] of Object.entries(accessData)) {
    const index = parseInt(indexStr, 10);
    const isSeq1 = index <= lenSeq;
    const color = isSeq1 ? seq1Color : seq2Color;
    const representsOne = isSeq1 ? seq1RepresentsOne : seq2RepresentsOne;
    const style = `fill: ${color};opacity: ${mapProbabilityToOpacity(prb, representsOne)}; stroke-width: 0;`;
    const prbTooltip = '\n' + prb.toExponential(2);
    addAccessibilityOverlay(session, index, style, prbTooltip);
  }
}
