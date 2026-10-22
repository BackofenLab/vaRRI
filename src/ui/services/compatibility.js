import { getIndexDictionary } from '../../core/model/indexing.js';

export function getCompatibilityValidationContext(v) {
  return {
    '1': {
      offset: v.offset1,
      sequence: v.sequence1
    },
    '2': {
      offset: v.offset2,
      sequence: v.sequence2
    }
  };
}

export function getVisibleSequencePositionSets(v) {
  const visible = {
    '1': new Set(),
    '2': new Set()
  };
  const indexDictionary = getIndexDictionary(v);
  Object.values(indexDictionary).forEach(([seqName, pos]) => {
    if (seqName === 's1') visible['1'].add(pos);
    if (seqName === 's2') visible['2'].add(pos);
  });
  return visible;
}

export function validateStartIndexCompatibility(api, args, parseProfiles) {
  const argsWithoutAnnotations = {
    ...args,
    subsequenceHighlights: [],
    regionHighlights: [],
    pointMutations: []
  };
  let validatedBase;
  try {
    validatedBase = api.validate(argsWithoutAnnotations);
  } catch (err) {
    return {
      ok: false,
      message: err && err.message ? err.message : String(err),
      focusField: null,
      startField: null
    };
  }
  const sequenceContext = getCompatibilityValidationContext(validatedBase);
  const visiblePositions = getVisibleSequencePositionSets(validatedBase);
  const highlights = api.getSubsequenceHighlights();
  for (const highlight of highlights) {
    try {
      api.createSubsequenceHighlight({
        sequence: highlight.sequence,
        range: highlight.range,
        color: highlight.color
      }, sequenceContext);
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      return {
        ok: false,
        message: `Start index ${highlight.sequence} is incompatible with subsequence highlight "${highlight.rangeText}": ${message}`,
        focusField: 'subseqRange',
        startField: highlight.sequence === '1' ? 'startIndex1' : 'startIndex2'
      };
    }
  }
  const regions = api.getRegionHighlights();
  for (const region of regions) {
    try {
      api.createRegionHighlight({
        sequence1Range: region.sequence1Range,
        sequence2Range: region.sequence2Range,
        color: region.color,
        generated: region.generated
      }, sequenceContext);
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      return {
        ok: false,
        message: `Start index ${region.sequence1Range[0]} is incompatible with region highlight "${region.rangeText}": ${message}`,
        focusField: 'regionSequence1Start',
        startField: 'startIndex1'
      };
    }
  }
  const mutations = api.getPointMutations();
  for (const mutation of mutations) {
    try {
      const normalized = api.createPointMutation({
        sequence: mutation.sequence,
        position: mutation.position,
        replacement: mutation.replacement,
        color: mutation.color
      }, sequenceContext);
      if (!visiblePositions[normalized.sequence].has(normalized.position)) {
        return {
          ok: false,
          message: `Start index ${normalized.sequence} is incompatible with mutation ${normalized.labelText}.`,
          focusField: 'mutationPosition',
          startField: normalized.sequence === '1' ? 'startIndex1' : 'startIndex2'
        };
      }
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      const mutationSeq = String(mutation.sequence);
      return {
        ok: false,
        message: `Start index ${mutationSeq} is incompatible with mutation at ${mutation.position}: ${message}`,
        focusField: 'mutationPosition',
        startField: mutationSeq === '1' ? 'startIndex1' : 'startIndex2'
      };
    }
  }
  try {
    parseProfiles(validatedBase, argsWithoutAnnotations);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    const fieldId = err && err.fieldId ? err.fieldId : null;
    const seq = fieldId === 'profileData2' ? '2' : '1';
    return {
      ok: false,
      message: `Start index ${seq} is incompatible with profile data: ${message}`,
      focusField: fieldId,
      startField: seq === '1' ? 'startIndex1' : 'startIndex2'
    };
  }
  return {
    ok: true
  };
}

