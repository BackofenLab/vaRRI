import { getIndexDictionary, getSequenceIndices } from '../../core/model/indexing.js';

/** Convert the existing comma/semicolon profile format into its editable form. */
export function convertCsvProfileText(text) {
  const lines = String(text || '').split(/\r?\n/);
  if (lines.length < 2) return String(text || '');
  const expression = /^\s*(-?\d+)([,;])(\d+(?:\.\d+)?)/;
  const match = lines[1].match(expression);
  if (!match) return String(text || '');
  const firstIsData = expression.test(lines[0]);
  return lines.map((line, index) => {
    let converted = line.split(match[2]).join(' ');
    if (index === 0 && !firstIsData && !/^\s*#/.test(converted)) converted = '#' + converted;
    return converted;
  }).join('\n');
}

export function parseProfileText(text, fieldId) {
  const data = [];
  String(text || '').split(/\r?\n/).forEach((line, lineNo) => {
    if (/^\s*(?:#|$)/.test(line)) return;
    const match = line.match(/^\s*(-?\d+)\s+(\d+(?:\.\d+)?)/);
    if (!match) throw {
      fieldId, message: `Invalid profile line ${lineNo + 1}. Expected empty/comment or "index value" data line.`,
    };
    const entry = { index: Number.parseInt(match[1], 10), value: Number.parseFloat(match[2]) };
    if (entry.value < 0 || entry.value > 1) throw {
      fieldId, message: `Invalid profile line ${lineNo + 1}. Probability value must be within [0, 1].`,
    };
    data.push(entry);
  });
  return data;
}

export function getOriginalProfileSequencePositions(validated, seqId) {
  return getSequenceIndices(`s${seqId}`, validated[`offset${seqId}`], validated[`sequence${seqId}`].length)
    .map(([, position]) => position);
}

/** Resolve profiles against uncropped biological coordinates, then visible IDs. */
export function mapProfileDataToAccessData(data, seqId, reference, validated, uncropped) {
  const sourcePositions = getOriginalProfileSequencePositions(uncropped, seqId);
  const sourceSet = new Set(sourcePositions);
  const visibleSet = new Set(getOriginalProfileSequencePositions(validated, seqId));
  const nodeIds = Object.fromEntries(Object.entries(getIndexDictionary(validated))
    .filter(([, [sequence]]) => sequence === `s${seqId}`)
    .map(([id, [, position]]) => [position, Number(id)]));
  const access = {};
  data.forEach(({ index, value }) => {
    let position = index;
    if (reference === '1') {
      if (!Number.isInteger(index) || index < 1 || index > sourcePositions.length) throw {
        fieldId: `profileData${seqId}`,
        message: `Profile index ${index} is out of 1-based sequence bounds [1, ${sourcePositions.length}] for sequence ${seqId}.`,
      };
      position = sourcePositions[index - 1];
    }
    const nodeId = nodeIds[position];
    if (!nodeId) {
      if (sourceSet.has(position) && !visibleSet.has(position)) return;
      throw {
        fieldId: `profileData${seqId}`,
        message: `Profile index ${index} does not map to a valid nucleotide of sequence ${seqId}.`,
      };
    }
    access[nodeId] = value;
  });
  return access;
}
