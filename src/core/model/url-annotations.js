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
const RANGE = '-?\\d+--?\\d+';
const RANGE_LIST = `${RANGE}(?:\\s*,\\s*${RANGE})*`;
const COLOR = '(?:[0-9a-fA-F]{3,8}|css~[^:,]+)';
const STYLE = `(?::(${COLOR})(?::([01](?:\\.\\d+)?))?)?`;
const SUBSEQUENCE = new RegExp(`^([12]):(${RANGE_LIST})${STYLE}$`, 'i');
const OPEN_SUBSEQUENCE = new RegExp(`^[12]:${RANGE_LIST}$`);
const RANGE_CONTINUATION = new RegExp(`^${RANGE}${STYLE}$`, 'i');

/**
 * Nonhex annotation colors use an explicit encoded data token. This preserves
 * the model's CSS-string contract without a DOM or widening legacy raw tokens.
 * CSS semantics remain the renderer/browser's responsibility.
 */
function annotationColor(token, fallback) {
  if (!token) return fallback;
  if (token.slice(0, 4).toLowerCase() !== 'css~') return parseUrlColor(token, fallback);
  try {
    const color = decodeURIComponent(token.slice(4));
    return color.trim() && !/[\u0000-\u001f\u007f-\u009f]/.test(color) ? color : null;
  } catch { return null; }
}

/** Preserve list boundaries while allowing comma-separated ranges in one group. */
function tokens(params, key, groupedRanges) {
  const records = [];
  for (const value of (params.get(key) || '').split(',').map(part => part.trim()).filter(Boolean)) {
    if (groupedRanges && RANGE_CONTINUATION.test(value) && OPEN_SUBSEQUENCE.test(records.at(-1) || '')) {
      records[records.length - 1] += ',' + value;
    } else records.push(value);
  }
  return records;
}

/** Decode only the first occurrence, matching existing shared-link behavior. */
function readList(params, key, expression, convert, groupedRanges = false) {
  return tokens(params, key, groupedRanges).flatMap(value => {
    const match = value.match(expression);
    const item = match ? convert(match) : null;
    return item ? [item] : [];
  });
}

export function decodeUrlAnnotations(params, defaults = {}) {
  const colors = { ...DEFAULTS, ...defaults };
  return {
    pointMutations: readList(params, 'mutations', new RegExp(`^([12]):(-?\\d+)(.)(?::(${COLOR}))?$`, 'i'),
      match => {
        const color = annotationColor(match[4], colors.mutationColor);
        return color === null ? null : {
          sequence: match[1], position: Number.parseInt(match[2], 10), replacement: match[3], color,
        };
      }),
    subsequenceHighlights: readList(params, 'subseqHighlights', SUBSEQUENCE,
      match => {
        const color = annotationColor(match[3], colors.subsequenceColor);
        const range = match[2].split(',').map(value => value.trim().match(/^(-?\d+)-(-?\d+)$/).slice(1).map(Number));
        return color === null ? null : {
          sequence: match[1], range, rangeText: range.map(pair => pair.join('-')).join(','), color,
          alpha: match[4] === undefined ? colors.subsequenceAlpha : Number.parseFloat(match[4]),
        };
      }, true),
    regionHighlights: readList(params, 'regionHighlights',
      new RegExp(`^(-?\\d+)-(-?\\d+)&(-?\\d+)-(-?\\d+)${STYLE}$`, 'i'),
      match => {
        const color = annotationColor(match[5], colors.regionColor);
        return color === null ? null : {
          sequence1Range: [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)],
          sequence2Range: [Number.parseInt(match[3], 10), Number.parseInt(match[4], 10)],
          rangeText: `${match[1]}-${match[2]}&${match[3]}-${match[4]}`, color,
          alpha: match[6] === undefined ? colors.regionAlpha : Number.parseFloat(match[6]),
        };
      }),
  };
}

function encodeStyle(color, alpha) {
  if (!color) return '';
  const literal = String(color);
  const hex = literal.replace('#', '');
  const value = /^[0-9a-fA-F]{3,8}$/.test(hex) ? hex : `css~${encodeURIComponent(literal)}`;
  return `:${value}${alpha === undefined || alpha === null ? '' : `:${alpha}`}`;
}

function subsequenceRanges(item) {
  if (Array.isArray(item.range)) {
    return item.range.map(range => Array.isArray(range) ? range.join('-') : String(range)).join(',');
  }
  const value = typeof item.rangeText === 'string' && item.rangeText ? item.rangeText : item.range;
  if (typeof value !== 'string' || value === 'undefined') return '';
  return value.split(',').map(part => {
    const token = part.trim();
    return /^-?\d+$/.test(token) ? `${token}-${token}` : token;
  }).join(',');
}

/** Preserve legacy tokens, adding tagged CSS colors; automatic regions are omitted. */
export function encodeUrlAnnotations(params, annotations = {}) {
  const mutations = (annotations.pointMutations || []).map(item =>
    `${item.sequence}:${item.position}${item.replacement}${encodeStyle(item.color)}`
  ).join(',');
  if (mutations) params.append('mutations', mutations);

  const subsequences = (annotations.subsequenceHighlights || []).flatMap(item => {
    const range = subsequenceRanges(item);
    return range ? [`${item.sequence || '1'}:${range}${encodeStyle(item.color, item.alpha)}`] : [];
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
