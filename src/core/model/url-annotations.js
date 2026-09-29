/** The established URL color grammar accepts unprefixed or prefixed hex. */
export function parseUrlColor(value, fallback) {
  if (!value) return fallback;
  const clean = String(value).trim().replace('#', '').toUpperCase();
  return /^[0-9A-F]{3,8}$/.test(clean) ? `#${clean}` : fallback;
}

const DEFAULTS = {
  mutationColor: '#006400', subsequenceColor: '#800080', regionColor: '#FF0000',
  subsequenceAlpha: 0.3, regionAlpha: 0.2,
};

/** Decode only the first occurrence, matching existing shared-link behavior. */
function readList(params, key, expression, convert) {
  return (params.get(key) || '').split(',').map(value => value.trim()).filter(Boolean)
    .flatMap(value => {
      const match = value.match(expression);
      return match ? [convert(match)] : [];
    });
}

export function decodeUrlAnnotations(params, defaults = {}) {
  const colors = { ...DEFAULTS, ...defaults };
  return {
    pointMutations: readList(params, 'mutations', /^([12]):(-?\d+)(.)(?::([0-9a-fA-F]{3,8}))?$/i,
      match => ({
        sequence: match[1], position: Number.parseInt(match[2], 10), replacement: match[3],
        color: parseUrlColor(match[4], colors.mutationColor),
      })),
    subsequenceHighlights: readList(params, 'subseqHighlights',
      /^([12]):(-?\d+)-(-?\d+)(?::([0-9a-fA-F]{3,8})(?::([01](?:\.\d+)?))?)?$/i,
      match => ({
        sequence: match[1], range: [[Number.parseInt(match[2], 10), Number.parseInt(match[3], 10)]],
        rangeText: `${Number.parseInt(match[2], 10)}-${Number.parseInt(match[3], 10)}`,
        color: parseUrlColor(match[4], colors.subsequenceColor),
        alpha: match[5] === undefined ? colors.subsequenceAlpha : Number.parseFloat(match[5]),
      })),
    regionHighlights: readList(params, 'regionHighlights',
      /^(-?\d+)-(-?\d+)&(-?\d+)-(-?\d+)(?::([0-9a-fA-F]{3,8})(?::([01](?:\.\d+)?))?)?$/i,
      match => ({
        sequence1Range: [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)],
        sequence2Range: [Number.parseInt(match[3], 10), Number.parseInt(match[4], 10)],
        rangeText: `${match[1]}-${match[2]}&${match[3]}-${match[4]}`,
        color: parseUrlColor(match[5], colors.regionColor),
        alpha: match[6] === undefined ? colors.regionAlpha : Number.parseFloat(match[6]),
      })),
  };
}

function encodeStyle(color, alpha) {
  const value = color ? String(color).replace('#', '') : '';
  if (!value) return '';
  return `:${value}${alpha === undefined || alpha === null ? '' : `:${alpha}`}`;
}

/** Append the legacy annotation grammar; automatic regions are never persisted. */
export function encodeUrlAnnotations(params, annotations = {}) {
  const mutations = (annotations.pointMutations || []).map(item =>
    `${item.sequence}:${item.position}${item.replacement}${encodeStyle(item.color)}`
  ).join(',');
  if (mutations) params.append('mutations', mutations);

  const subsequences = (annotations.subsequenceHighlights || []).flatMap(item => {
    const prefix = `${item.sequence || '1'}:`;
    const style = encodeStyle(item.color, item.alpha);
    if (typeof item.rangeText === 'string' && item.rangeText && item.rangeText !== 'undefined') {
      return [`${prefix}${item.rangeText}${style}`];
    }
    if (Array.isArray(item.range)) {
      return item.range.map(range => `${prefix}${Array.isArray(range) ? range.join('-') : range}${style}`);
    }
    return typeof item.range === 'string' && item.range !== 'undefined' ? [`${prefix}${item.range}${style}`] : [];
  }).join(',');
  if (subsequences) params.append('subseqHighlights', subsequences);

  const regions = (annotations.regionHighlights || []).filter(item => !item.generated).map(item => {
    const range = typeof item.rangeText === 'string' && item.rangeText && item.rangeText !== 'undefined'
      ? item.rangeText
      : `${item.sequence1Range?.join('-') || ''}&${item.sequence2Range?.join('-') || ''}`;
    return `${range}${encodeStyle(item.color, item.alpha)}`;
  }).join(',');
  if (regions) params.append('regionHighlights', regions);
  return params;
}
