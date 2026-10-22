import { splitAtAmpersand } from './brackets.js';

export function formatStructure(structure) {
  const [structure1, structure2] = splitAtAmpersand(structure);
  const bare = structure1 + structure2;
  return {
    structure1,
    structure2,
    structure,
    structure_dict: Object.fromEntries(Array.from(bare, (base, i) => [i + 1, base]))
  };
}

export function formatSequence(sequence) {
  const [sequence1, sequence2] = splitAtAmpersand(sequence);
  const bare = sequence1 + sequence2;
  return {
    sequence1,
    sequence2,
    sequence,
    sequence_dict: Object.fromEntries(Array.from(bare, (base, i) => [i + 1, base]))
  };
}

/**
 * Determine how many molecules are given (`"1"` or `"2"`).
 *
 * @param {{sequence2: string}} validated
 * @returns {"1"|"2"}
 */
export function getMolecules(validated) {
  return validated.sequence2 !== '' ? '2' : '1';
}

export function getSequenceIndices(seqId, offset, length) {
  const indices = [];
  let position = offset;
  while (indices.length < length) {
    if (position !== 0) indices.push([seqId, position]);
    position += 1;
  }
  return indices;
}

export function getIndexDictionary(v) {
  const indices = [...getSequenceIndices('s1', v.offset1, v.sequence1.length), ...getSequenceIndices('s2', v.offset2, v.sequence2.length)];
  return Object.fromEntries(indices.map((entry, i) => [i + 1, entry]));
}

/**
 * Find the node ID that corresponds to a given sequence position.
 *
 * @param {Object} v
 * @param {'1'|'2'} sequence
 * @param {number} position
 * @returns {number}
 */
export function getNodeIdForSequencePosition(v, sequence, position) {
  for (const [nodeId, [seqName, seqPosition]] of Object.entries(getIndexDictionary(v))) {
    if (seqName === `s${sequence}` && seqPosition === position) {
      return parseInt(nodeId, 10);
    }
  }
  return 0;
}

/**
 * Crop leading and trailing unpaired nucleotides from sequences and structures.
 * 
 * @param {string} rawSeq 
 * @param {string} validStruc 
 * @param {integer} offset1 
 * @param {integer} offset2 
 * @param {integer} cropping 
 * @returns Object with updated rawSeq, validStruc, offset1, offset2
 */
export function applyCropping(rawSeq, validStruc, offset1, offset2, cropping) {
  // check if cropping is not set or is negative, return original values
  if (!cropping || cropping < 0) {
    return {
      rawSeq,
      validStruc,
      offset1,
      offset2
    };
  }
  let seq = rawSeq.split('&');
  let str = validStruc.split('&');
  let off = [offset1, offset2];
  for (let i = 0; i < seq.length; i++) {
    // leading cropping
    let unpairedLeading = str[i].match(/^\.+/);
    if (unpairedLeading && unpairedLeading[0].length > cropping) {
      seq[i] = seq[i].slice(unpairedLeading[0].length - cropping);
      str[i] = str[i].slice(unpairedLeading[0].length - cropping);
      const offOld = off[i];
      off[i] += unpairedLeading[0].length - cropping;
      if (off[i] >= 0 && offOld < 0) {
        off[i] += 1;
      } // skip 0
    }
    // trailing cropping
    let trailing = str[i].match(/\.+$/);
    if (trailing && trailing[0].length > cropping) {
      seq[i] = seq[i].slice(0, seq[i].length - (trailing[0].length - cropping));
      str[i] = str[i].slice(0, str[i].length - (trailing[0].length - cropping));
    }
  }

  // return updated values
  return {
    rawSeq: seq.join("&"),
    validStruc: str.join("&"),
    offset1: off[0],
    offset2: off[1]
  };
}
