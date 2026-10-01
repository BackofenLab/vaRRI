export const DEFAULT_SEQUENCE_NAMES = Object.freeze({ seq1name: 'Seq. 1', seq2name: 'Seq. 2' });

/** Empty editor values restore the strand's default name. */
export function normalizeSequenceName(value, sequence) {
  if (!['1', '2'].includes(String(sequence))) throw new Error('Sequence name must identify strand 1 or 2.');
  if (typeof value !== 'string') throw new Error('Sequence name must be text.');
  return value.trim() || DEFAULT_SEQUENCE_NAMES[`seq${sequence}name`];
}

export function getSequenceNames(modelState) {
  return { seq1name: modelState.seq1name, seq2name: modelState.seq2name };
}

/** Update names and their existing labels together, preserving label placement. */
export function setSequenceNames(modelState, patch) {
  const names = {};
  for (const sequence of ['1', '2']) {
    const key = `seq${sequence}name`;
    if (Object.hasOwn(patch, key) && patch[key] !== undefined) names[key] = normalizeSequenceName(patch[key], sequence);
  }
  Object.assign(modelState, names);
  for (const item of modelState.annotations.texts.items) {
    if (item.sequenceNameFor && Object.hasOwn(names, `seq${item.sequenceNameFor}name`)) {
      item.text = names[`seq${item.sequenceNameFor}name`];
    }
  }
  return getSequenceNames(modelState);
}
