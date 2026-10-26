import { URL_CHECKBOX_FIELDS, URL_UI_ONLY_FIELDS } from './url-state.js';
import { createPointMutation } from './mutations.js';
import { createSubsequenceHighlight } from './subsequences.js';
import { createRegionHighlight } from './regions.js';
import { createTextAnnotation } from './text-annotations.js';

const TEXT_FIELDS = [
  'sequence', 'structure', 'seqName1', 'seqName2', 'startIndex1', 'startIndex2', 'cropping',
  'colorSeq1', 'colorSeq2', 'coloring', 'highlighting', 'backgroundhighlighting',
  'profileData1', 'profileData2', 'profileIdxRef1', 'profileIdxRef2',
  'profileColor1', 'profileColor2', 'colorRriNodes', 'colorRriRegion', 'colorBasepair',
];
const NUMERIC_FIELDS = new Set(['startIndex1', 'startIndex2', 'cropping', 'profileIdxRef1', 'profileIdxRef2']);
const CHOICES = {
  coloring: ['strand', 'loop'], highlighting: ['region', 'basepairs', 'nothing'],
  backgroundhighlighting: ['region', 'basepairs', 'nothing'],
  profileIdxRef1: ['1', 'start'], profileIdxRef2: ['1', 'start'],
};
const ANNOTATIONS = { pointMutations: createPointMutation,
  subsequenceHighlights: createSubsequenceHighlight, regionHighlights: createRegionHighlight,
  textAnnotations: createTextAnnotation };

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be a JSON object.`);
  }
  return value;
}

function readFields(input) {
  return Object.fromEntries(Object.entries(object(input, 'fields')).map(([key, raw]) => {
    let value = raw;
    if (URL_CHECKBOX_FIELDS.includes(key)) {
      if (typeof value !== 'boolean') throw new Error(`fields.${key} must be true or false.`);
    } else {
      if (!TEXT_FIELDS.includes(key)) throw new Error(`Unknown session field: ${key}.`);
      if (NUMERIC_FIELDS.has(key) && Number.isFinite(value)) value = String(value);
      if (typeof value !== 'string') throw new Error(`fields.${key} must be a string.`);
      if (/^(color|profileColor)/.test(key) && key !== 'coloring' && !/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) {
        throw new Error(`fields.${key} must be a hex color such as #ff0000.`);
      }
      if (Object.hasOwn(CHOICES, key) && !CHOICES[key].includes(value)) {
        throw new Error(`fields.${key} must be one of: ${CHOICES[key].join(', ')}.`);
      }
    }
    return [key, value];
  }));
}

function readAnnotations(input = {}) {
  return Object.fromEntries(Object.entries(object(input, 'annotations')).map(([key, items]) => {
    if (!Object.hasOwn(ANNOTATIONS, key)) throw new Error(`Unknown annotation collection: ${key}.`);
    if (!Array.isArray(items)) throw new Error(`annotations.${key} must be an array.`);
    return [key, items.filter(item => key !== 'regionHighlights' || !item?.generated).map((input, index) => {
      try {
        object(input, 'Annotation');
        if (input.alpha !== undefined && (!Number.isFinite(input.alpha) || input.alpha < 0 || input.alpha > 1)) {
          throw new Error('alpha must be a number between 0 and 1.');
        }
        // Persist user definitions, never registry IDs or derived renderer data.
        const { id, reference, nodeId, labelText, rangeText, generated, ...item } = ANNOTATIONS[key](input);
        return item;
      } catch (error) { throw new Error(`annotations.${key}[${index}]: ${error.message}`); }
    })];
  }));
}

/** Decode an editable session file without a DOM. Sequence validation is separate. */
export function decodeJsonState(input) {
  let data;
  try { data = typeof input === 'string' ? JSON.parse(input.replace(/^\uFEFF/, '')) : input; }
  catch { throw new Error('The file is not valid JSON.'); }
  object(data, 'Session');
  if (data.format !== 'vaRRI') throw new Error('Expected a vaRRI JSON session (format: "vaRRI").');
  if (data.version !== 1) throw new Error(`Unsupported vaRRI JSON version: ${data.version}. Expected 1.`);
  const rotation = data.rotation === undefined ? 0 : data.rotation;
  if (!Number.isFinite(rotation)) throw new Error('rotation must be a finite number.');
  const showRenderingOnly = data.showRenderingOnly === undefined ? false : data.showRenderingOnly;
  if (typeof showRenderingOnly !== 'boolean') throw new Error('showRenderingOnly must be true or false.');
  return { fields: readFields(data.fields), annotations: readAnnotations(data.annotations), rotation, showRenderingOnly };
}

/** Encode the same field/annotation DTO as encodeUrlState, with native JSON values. */
export function encodeJsonState(state = {}) {
  const fields = Object.fromEntries(Object.entries(state.fields || {})
    .filter(([key]) => !URL_UI_ONLY_FIELDS.includes(key)));
  const decoded = decodeJsonState({ format: 'vaRRI', version: 1, ...state, fields });
  return JSON.stringify({ format: 'vaRRI', version: 1, ...decoded }, null, 2) + '\n';
}
