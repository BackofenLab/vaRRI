import { decodeUrlAnnotations, encodeUrlAnnotations, parseUrlColor } from './url-annotations.js';

export const URL_CHECKBOX_FIELDS = Object.freeze([
  'distinctBpTypes', 'profileColorRepresentsOne1', 'profileColorRepresentsOne2',
  'forceLayout', 'forceLayoutFreeTails', 'forceLayoutPullCrossing',
  'forceLayoutLinearStructure', 'forceLayoutLinearRRI', 'hideFooterAndHeader',
]);

export const URL_UI_ONLY_FIELDS = Object.freeze([
  'fastaInput', 'fastaSequence', 'fastaStructure',
  'regionEditId', 'region1', 'region2', 'regionColor', 'regionAlpha',
  'subseqEditId', 'subseqSequence', 'subseqRange', 'subseqColor', 'subseqAlpha',
  'mutationEditId', 'mutationSequence', 'mutationPosition', 'mutationBase', 'mutationColor',
  'rotationSlider',
]);

const COLOR_DEFAULTS = {
  colorSeq1: '#ADD8E6', colorSeq2: '#F4BB44', profileColor1: '#800080', profileColor2: '#FF0000',
  colorRriNodes: '#FF0000', colorRriRegion: '#FF0000', colorBasepair: '#FF0000',
  subseqColor: '#800080', regionColor: '#FF0000', mutationColor: '#006400',
};
const STRUCTURED_FIELDS = new Set(['mutations', 'subseqHighlights', 'regionHighlights', 'rotation', 'showRenderingOnly']);

function toParams(input) {
  if (typeof input === 'string') {
    const query = input.includes('?') ? input.slice(input.indexOf('?') + 1) : input;
    return new URLSearchParams(query.split('#')[0]);
  }
  return new URLSearchParams(input);
}

/**
 * Decode a query without accessing the DOM. Repeated ordinary controls retain
 * their values as arrays in original order; applying each value preserves the
 * UI's last-value-wins behavior. Structured annotations and rotation use the
 * first occurrence, as existing vaRRI links do. Registry validation is separate.
 */
export function decodeUrlState(input, defaults = {}) {
  const params = toParams(input);
  const fields = {};
  params.forEach((raw, key) => {
    if (STRUCTURED_FIELDS.has(key)) return;
    let value = raw;
    if (URL_CHECKBOX_FIELDS.includes(key)) value = raw === 'on' || raw === 'true' || raw === '1';
    else if (Object.hasOwn(COLOR_DEFAULTS, key)) {
      const previous = Object.hasOwn(fields, key) ? fields[key] : defaults[key] || COLOR_DEFAULTS[key];
      value = parseUrlColor(raw, Array.isArray(previous) ? previous.at(-1) : previous);
    }
    const existing = Object.hasOwn(fields, key) ? fields[key] : undefined;
    Object.defineProperty(fields, key, {
      value: existing === undefined ? value : Array.isArray(existing) ? [...existing, value] : [existing, value],
      enumerable: true, writable: true, configurable: true,
    });
  });
  const rotation = Number.parseFloat(params.get('rotation'));
  return {
    fields,
    annotations: decodeUrlAnnotations(params, defaults.annotations),
    rotation: Number.isNaN(rotation) ? 0 : rotation,
    showRenderingOnly: params.has('showRenderingOnly') && !['false', '0'].includes(params.get('showRenderingOnly')),
  };
}

/** Encode serializable field/annotation DTOs using the established URL keys. */
export function encodeUrlState(state = {}) {
  const params = new URLSearchParams();
  Object.entries(state.fields || {}).forEach(([key, values]) => {
    if (URL_UI_ONLY_FIELDS.includes(key) || STRUCTURED_FIELDS.has(key)) return;
    (Array.isArray(values) ? values : [values]).forEach(value => {
      if (typeof value === 'boolean') params.append(key, value ? '1' : '0');
      else if (value !== undefined && value !== null && String(value).trim() !== '') params.append(key, String(value).trim());
    });
  });
  if (state.rotation !== undefined && Number(state.rotation) !== 0) params.append('rotation', String(state.rotation));
  encodeUrlAnnotations(params, state.annotations);
  if (state.showRenderingOnly) params.append('showRenderingOnly', '1');
  return params;
}
