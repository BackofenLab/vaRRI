/** Default palette; each API instance owns a separate mutable copy. */
export const DEFAULT_COLORS = Object.freeze({
  /** Fill colour for nucleotide circles of sequence 1 in strand-colouring mode. */
  sequence1: 'lightblue',
  /** Fill colour for nucleotide circles of sequence 2 in strand-colouring mode. */
  sequence2: '#F4BB44',
  /** Default fill colour for sequence-1 accessibility/profile overlays. */
  seq1profileColor: 'purple',
  /** Default fill colour for sequence-2 accessibility/profile overlays. */
  seq2profileColor: 'red',
  /** Default fill colour for point mutation overlays. */
  mutationColor: 'Darkgreen',
  /** Stroke colour used for intermolecular nucleotide and index-label highlighting. */
  intermolecularHighlight: 'red',
  /** Fill/stroke colour used for background (region / basepair-stack) highlighting. */
  backgroundHighlight: 'red',
  /** Stroke colour used for subsequence-highlighting polylines and circles. */
  subsequenceHighlight: 'purple',
  /** Stroke colour used for basepair links. */
  basepair: 'red'
});


/**
 * Override one or more default rendering colours.
 *
 * Only the keys present in `overrides` are changed; all others retain
 * their current values.  The new colours take effect on the next call to
 * any rendering function.
 *
    * Valid keys: `sequence1`, `sequence2`, `seq1profileColor`, `seq2profileColor`,
    * `mutationColor`, `intermolecularHighlight`, `backgroundHighlight`, `subsequenceHighlight`, `basepair`.
 *
 * @param {Partial<typeof COLORS>} overrides  Key → CSS-colour-string map.
 */
export function setColors(modelState, overrides) {
  Object.assign(modelState.colors, overrides);
}

/**
 * Return a shallow copy of the current colour settings.
 *
 * @returns {typeof COLORS}
 */
export function getColors(modelState) {
  return {
    ...modelState.colors
  };
}

/**
 * Generate a color list for two sequences.
 *
 * Each nucleotide in `seq1` maps to {@link COLORS.sequence1};
 * each nucleotide in `seq2` maps to {@link COLORS.sequence2}.
 *
 * @param {string} seq1
 * @param {string} seq2
 * @returns {string[]}
 */
export function sequenceColoring(modelState, seq1, seq2) {
  return [...Array.from(seq1, () => modelState.colors.sequence1), ...Array.from(seq2, () => modelState.colors.sequence2)];
}
