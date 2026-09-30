import { createTextAnnotation } from './text-annotations.js';

/** Missing means use initial labels; an explicit empty array means keep none. */
export function decodeUrlTextAnnotations(params) {
  if (!params.has('textAnnotations')) return {};
  let records;
  try { records = JSON.parse(params.get('textAnnotations')); }
  catch { return { textAnnotations: [] }; }
  if (!Array.isArray(records)) return { textAnnotations: [] };
  return { textAnnotations: records.flatMap(input => {
    try {
      const { id, ...item } = createTextAnnotation(input);
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
