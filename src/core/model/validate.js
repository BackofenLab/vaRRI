import { DEFAULT_COLORS } from "./colors.js";
import { applyCropping, formatSequence, formatStructure, getMolecules, getNodeIdForSequencePosition } from './indexing.js';
import { validateBackgroundhighlighting, validateCroppingInput, validateHighlighting, validateOffset, validateSequenceInput, validateStructureInput } from './input.js';
import { createPointMutation } from './mutations.js';
import { createRegionHighlight } from './regions.js';
import { createSubsequenceHighlight } from './subsequences.js';
import { createTextAnnotation } from './text-annotations.js';

/**
 * Validate all inputs and return a `validated` parameter object ready for rendering.
 *
 * @param {Object} args  Raw input parameters.
 * @param {string} args.structure    Dot-bracket structure, one or two molecules separated by `&`.
 * @param {string} args.sequence     RNA sequence, one or two molecules separated by `&`.
 * @param {string} [args.cropping="-1"]  Cropping value (integer string).
 * @param {string} [args.startIndex1="1"]  Start index for sequence 1.
 * @param {string} [args.startIndex2="1"]  Start index for sequence 2.
 * @param {string} [args.labelInterval="10"]  Interval for index label display.
 * @param {string} [args.coloring="strand"]  Coloring option: `"strand"` or `"loop"`.
 * @param {string} [args.highlighting="region"]  Highlighting option: `"nothing"`, `"basepairs"`, `"region"`.
 * @param {string} [args.backgroundhighlighting="basepairs"]  Background-highlighting option.
 * @param {boolean} [args.distinctBpTypes=true]  Whether to display G-U basepairs as dashed lines.
    * @param {Array<{sequence:string|number, range:string|Array<[number, number]>, color?:string}>} [args.subsequenceHighlights=[]]
    *     Generic subsequence-highlight definitions.
 * @returns {Object}  Validated parameter dictionary.
 * @throws {Error}  On invalid input.
 */
export function validate(args, colors = DEFAULT_COLORS) {
  const v = {};

  // Sequence
  const rawSeq = (args.sequence || '').trim();
  validateSequenceInput(rawSeq);

  // Structure
  const rawStruc = (args.structure || '').trim();
  const validStruc = validateStructureInput(rawStruc, rawSeq);

  // Offsets
  v.offset1 = validateOffset(String(args.startIndex1 || '1'));
  v.offset2 = validateOffset(String(args.startIndex2 || '1'));

  // Cropping
  const cropping = validateCroppingInput(validStruc, String(args.cropping || '-1'));

  // update sequences, structures and offsets based on cropping
  const cropped = applyCropping(rawSeq, validStruc, v.offset1, v.offset2, cropping);

  // update offset information
  v.offset1 = cropped.offset1;
  v.offset2 = cropped.offset2;

  // create the formatted sequence and structure objects
  const seqFmt = formatSequence(cropped.rawSeq);
  Object.assign(v, seqFmt);
  const strucFmt = formatStructure(cropped.validStruc);
  Object.assign(v, strucFmt);

  // Molecules
  v.molecules = getMolecules(v);

  // Options
  v.coloring = args.coloring || 'strand';
  v.highlighting = validateHighlighting(args.highlighting || 'region');
  v.backgroundhighlighting = validateBackgroundhighlighting(args.backgroundhighlighting || 'basepairs');
  v.distinctBpTypes = args.distinctBpTypes !== false; // default true
  v.labelInterval = parseInt(String(args.labelInterval || '10'), 10) || 10;

  // Subsequence highlights
  const sequenceContext = {
    '1': {
      offset: v.offset1,
      length: v.sequence1.length,
      sequence: v.sequence1
    },
    '2': {
      offset: v.offset2,
      length: v.sequence2.length,
      sequence: v.sequence2
    }
  };
  if (Array.isArray(args.subsequenceHighlights)) {
    v.subsequenceHighlights = args.subsequenceHighlights.map(h => createSubsequenceHighlight(h, sequenceContext, colors));
  } else {
    v.subsequenceHighlights = [];
  }
  if (Array.isArray(args.regionHighlights)) {
    v.regionHighlights = args.regionHighlights.map(highlight => createRegionHighlight(highlight, sequenceContext, colors));
  } else {
    v.regionHighlights = [];
  }
  if (Array.isArray(args.pointMutations)) {
    v.pointMutations = args.pointMutations.map(mutation => createPointMutation(mutation, sequenceContext, colors));
    const seenMutationPositions = new Set();
    v.pointMutations.forEach(mutation => {
      const key = `${mutation.sequence}:${mutation.position}`;
      if (seenMutationPositions.has(key)) {
        throw new Error(`Duplicate point mutation at ${key}.`);
      }
      seenMutationPositions.add(key);
      mutation.nodeId = getNodeIdForSequencePosition(v, mutation.sequence, mutation.position);
      if (!mutation.nodeId) {
        throw new Error(`Mutation position ${mutation.position} is not visible in the current rendering.`);
      }
      mutation.labelText = `${mutation.reference || '?'}${mutation.position}${mutation.replacement}`;
    });
  } else {
    v.pointMutations = [];
  }
  // Absence retains the instance registry/defaults; [] explicitly removes text.
  if (Object.hasOwn(args, 'textAnnotations')) {
    if (!Array.isArray(args.textAnnotations)) throw new Error('Text annotations must be an array.');
    v.textAnnotations = args.textAnnotations.map(createTextAnnotation);
  }
  return v;
}
