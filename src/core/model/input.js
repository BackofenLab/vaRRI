import { checkStructureInputSimple, splitAtAmpersand } from './brackets.js';
import { getSequenceIndices } from './indexing.js';

/**
 * Validate a sequence string — must consist of IUPAC nucleotide characters,
 * optionally separated by a single `&`.
 *
 * @param {string} sequence
 * @returns {string}  The validated sequence.
 * @throws {Error}
 */
export function validateSequenceInput(sequence) {
  if (sequence === '') throw new Error('No sequence given');
  if (/^([aAcCgGtTuUrRyYsSwWkKmMbBdDhHvVnN]+&)?[aAcCgGtTuUrRyYsSwWkKmMbBdDhHvVnN]+$/.test(sequence)) {
    return sequence;
  }
  // find first invalid character for better error message
  const invalidChars = sequence.replace(/[aAcCgGtTuUrRyYsSwWkKmMbBdDhHvVnN&]/g, '');
  throw new Error(`The given sequence input has invalid none-IUPAC characters: ${invalidChars}`);
}

/**
 * Validate cropping input.  Must be an integer string, and disallowed for
 * @param {string} cropping (integer string to be validated)
 * @param {string} structure Validated structure string, used to check for unpaired-only structures)
 * @returns the validated cropping string
 * @throws {Error}  When cropping is not a valid integer or when cropping is disallowed for unpaired-only structures.
 */
export function validateCroppingInput(structure, cropping) {
  // check if cropping is not set, return default value
  if (!cropping) return '-1'; // default value

  // check if cropping is a valid integer string
  if (!/^-?\d+$/.test(cropping)) {
    throw new Error(`The given cropping input is not an integer: ${cropping}`);
  }

  // negative cropping is indicating no cropping, return -1
  if (parseInt(cropping, 10) < 0) return -1;

  // check if structure is only composed of dots (unpaired) and if so, disallow cropping
  if (structure) {
    if (!structure.match(/[^.&]/)) {
      throw new Error('Cropping is not allowed for structures with only unpaired nucleotides.');
    }
    if (structure.includes('&')) {
      // check structure of the first molecule (before &) if present
      const [struc1, struc2] = splitAtAmpersand(structure);
      if (!struc1.match(/[^.]/) || !struc2.match(/[^.]/)) {
        throw new Error('Cropping is not allowed for structures with only unpaired nucleotides in either molecule.');
      }
    }
  }
  return cropping;
}

/**
 * Validate a structure string in dot-bracket notation.
 *
 * @param {string} structure
 * @param {string} sequence  Used to check length parity when `&` is present.
 * @returns {string}  The validated structure.
 * @throws {Error}
 */
export function validateStructureInput(structure, sequence) {
  if (structure === '') throw new Error('No structure given');
  if (structure.includes('&')) {
    const [struc1, struc2] = splitAtAmpersand(structure);
    const [seq1, seq2] = splitAtAmpersand(sequence);
    for (const [idx, struc, seq] of [[1, struc1, seq1], [2, struc2, seq2]]) {
      if (struc.length !== seq.length) {
        throw new Error(`Structure length (${struc.length}) and Sequence length (${seq.length}) ` + `of molecule ${idx} do not match`);
      }
    }
  } else {
    if (structure.length !== sequence.length) {
      throw new Error(`Structure length (${structure.length}) and Sequence length (${sequence.length}) do not match`);
    }
  }
  if (/^([\.()<>\[\]{}]+&)?[\.()<>\[\]{}]+$/.test(structure)) {
    checkStructureInputSimple(structure);
    return structure;
  }
  throw new Error(`The given structure input is not valid: ${structure}`);
}

/**
 * Validate an offset value.
 *
 * @param {string} offsetStr  String representation of the offset.
 * @returns {number}
 * @throws {Error}
 */
export function validateOffset(offsetStr) {
  if (offsetStr === '0') throw new Error('Index 0 is not valid; use a value of -1 or less, or 1 or greater');
  if (/^-?\d+$/.test(offsetStr)) return parseInt(offsetStr, 10);
  throw new Error(`The given index input is not valid: ${offsetStr}`);
}

/**
 * Validate the highlighting option.
 *
 * @param {string} highlighting
 * @returns {string}
 * @throws {Error}
 */
export function validateHighlighting(highlighting) {
  const valid = ['nothing', 'basepairs', 'region'];
  if (valid.includes(highlighting)) return highlighting;
  throw new Error(`The given highlighting input (${highlighting}) is not accepted [nothing, basepairs, region]`);
}

/**
 * Validate the backgroundhighlighting option.
 *
 * @param {string} bgHighlighting
 * @returns {string}
 * @throws {Error}
 */
export function validateBackgroundhighlighting(bgHighlighting) {
  const valid = ['nothing', 'basepairs', 'region'];
  if (valid.includes(bgHighlighting)) return bgHighlighting;
  throw new Error(`The given backgroundhighlighting input (${bgHighlighting}) is not accepted [nothing, basepairs, region]`);
}

/**
 * Parse a comma-separated list of `"start-end"` range strings.
 *
 * @param {string|null|undefined} input
 * @param {number} [startIndex]
 * @param {number} [sequenceLength]
 * @param {string|null|undefined} [sequenceId]
 * @returns {Array<[number,number]>|null}
 */
export function parseSubsequences(input, startIndex, sequenceLength, sequenceId) {
  if (!input || input.trim() === '') return null;
  let validIndices = null;
  if (Number.isInteger(startIndex) && Number.isInteger(sequenceLength) && sequenceLength >= 0) {
    validIndices = new Set(getSequenceIndices('s', startIndex, sequenceLength).map(([, index]) => index));
  }
  const ranges = input.split(',').map(s => s.trim()).filter(Boolean);
  return ranges.map(r => {
    const match = r.match(/^(-?\d+)-(-?\d+)$/);
    if (!match) {
      throw new Error(`${sequenceId ? sequenceId + ": " : ""}Invalid subsequence range: "${r}". Expected "start-end".`);
    }
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (start === 0 || end === 0) {
      throw new Error(`${sequenceId ? sequenceId + ": " : ""}Invalid subsequence range: "${r}". Index 0 is not valid.`);
    }
    if (start > end) {
      throw new Error(`${sequenceId ? sequenceId + ": " : ""}Invalid subsequence range: "${r}". Start index must be <= end index.`);
    }
    if (validIndices && (!validIndices.has(start) || !validIndices.has(end))) {
      throw new Error(`${sequenceId ? sequenceId + ": " : ""}Invalid subsequence range: "${r}". Range endpoints must be valid sequence indices.`);
    }
    return [start, end];
  });
}
