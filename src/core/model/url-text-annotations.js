import { createTextAnnotation } from './text-annotations.js';

/** Missing uses initial labels; an explicit empty array leaves name labels unplaced. */
export function decodeUrlTextAnnotations(params) {
  if (!params.has('textAnnotations')) return {};
  let records;
  try { records = JSON.parse(params.get('textAnnotations')); }
  catch { return { textAnnotations: [] }; }
  if (!Array.isArray(records)) return { textAnnotations: [] };
  return { textAnnotations: records.flatMap(input => {
    try {
      // Earlier links identify default labels only by their canonical terminal
      // anchor. Do not guess identity from text or from a free label's position.
      const anchor = input?.anchor;
      const legacyName = !Object.hasOwn(input || {}, 'sequenceNameFor') &&
        ((anchor?.sequence === '1' && anchor.end === 'start') || (anchor?.sequence === '2' && anchor.end === 'end'));
      const { id, ...item } = createTextAnnotation(legacyName ? { ...input, sequenceNameFor: anchor.sequence } : input);
      return [item];
    } catch { return []; }
  }) };
}

/** JSON safely represents arbitrary Unicode text, punctuation and CSS colors. */
export function encodeUrlTextAnnotations(params, annotations) {
  if (!Array.isArray(annotations.textAnnotations)) return;
  const records = annotations.textAnnotations.map(input => {
    const { id, ...item } = createTextAnnotation(input);
    return item;
  });
  params.append('textAnnotations', JSON.stringify(records));
}
