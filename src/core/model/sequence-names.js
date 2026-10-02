export const DEFAULT_SEQUENCE_NAMES = Object.freeze({ seqName1: 'Seq. 1', seqName2: 'Seq. 2' });

/** Empty editor values restore the strand's default name. */
export function normalizeSequenceName(value, sequence) {
  if (!['1', '2'].includes(String(sequence))) throw new Error('Sequence name must identify strand 1 or 2.');
  if (typeof value !== 'string') throw new Error('Sequence name must be text.');
  return value.trim() || DEFAULT_SEQUENCE_NAMES[`seqName${sequence}`];
}

export function getSequenceNames(modelState) {
  return { seqName1: modelState.seqName1, seqName2: modelState.seqName2 };
}

/** Update names and their existing labels together, preserving label placement. */
export function setSequenceNames(modelState, patch) {
  const names = {};
  for (const sequence of ['1', '2']) {
    const key = `seqName${sequence}`;
    if (Object.hasOwn(patch, key) && patch[key] !== undefined) names[key] = normalizeSequenceName(patch[key], sequence);
  }
  Object.assign(modelState, names);
  for (const item of modelState.annotations.texts.items) {
    if (item.sequenceNameFor && Object.hasOwn(names, `seqName${item.sequenceNameFor}`)) {
      item.text = names[`seqName${item.sequenceNameFor}`];
    }
  }
  return getSequenceNames(modelState);
}
