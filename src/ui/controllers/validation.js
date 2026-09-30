import {
  getCompatibilityValidationContext, getVisibleSequencePositionSets,
  validateStartIndexCompatibility as checkCompatibility,
} from '../services/compatibility.js';

/** Form validation reads Vue fields and reports errors through shared UI actions. */
export function createValidationController({ api, state, actions }) {
  const fields = state.fields;
  const text = key => String(fields[key] ?? '').trim();

  function getBaseVisualizationArgs() {
    return {
      structure: text('structure'), sequence: text('sequence'),
      startIndex1: text('startIndex1') || '1', startIndex2: text('startIndex2') || '1',
      cropping: text('cropping') || '-1', labelInterval: '10',
      coloring: fields.coloring, highlighting: fields.highlighting,
      backgroundhighlighting: fields.backgroundhighlighting,
      distinctBpTypes: fields.distinctBpTypes,
      subsequenceHighlights: api.getSubsequenceHighlights(),
      regionHighlights: api.getRegionHighlights(), pointMutations: api.getPointMutations(),
    };
  }

  function getSequenceContext() {
    const validated = api.validate(getBaseVisualizationArgs());
    return Object.fromEntries(['1', '2'].map(sequence => [sequence, {
      id: `Sequence ${sequence}`, offset: validated[`offset${sequence}`],
      length: validated[`sequence${sequence}`]?.length || 0, sequence: validated[`sequence${sequence}`],
    }]));
  }

  function validateStartIndexCompatibility(args) {
    return checkCompatibility(api, args, (...parameters) => actions.parseProfileAccessData(...parameters));
  }

  function validateFields(args) {
    actions.clearAllFieldErrors();
    actions.clearMsg();
    let valid = true;
    function check(field, validator) {
      try { validator(); }
      catch (error) {
        actions.setFieldError(field, error.message || String(error));
        valid = false;
      }
    }
    if (!args.sequence) {
      actions.setFieldError('sequence', 'No sequence given.');
      valid = false;
    } else check('sequence', () => api.validateSequenceInput(args.sequence));
    if (!args.structure) {
      actions.setFieldError('structure', 'No structure given.');
      valid = false;
    } else if (args.sequence) check('structure', () => api.validateStructureInput(args.structure, args.sequence));
    if (args.cropping) {
      try { api.validateCroppingInput(args.structure, args.cropping); }
      catch (error) {
        actions.setFieldError('structure', error.message);
        actions.setFieldError('cropping', error.message);
        valid = false;
      }
    }
    for (const sequence of ['1', '2']) {
      check(`startIndex${sequence}`, () => api.validateOffset(String(args[`startIndex${sequence}`] || '1')));
      try {
        actions.convertCsvProfileData(`profileData${sequence}`);
        actions.parseProfileLines(`profileData${sequence}`);
      } catch (error) {
        actions.setFieldError(error.fieldId || `profileData${sequence}`, error.message || String(error));
        valid = false;
      }
    }
    if (valid) {
      const compatibility = validateStartIndexCompatibility(args);
      if (!compatibility.ok) {
        if (compatibility.startField) actions.setFieldError(compatibility.startField, compatibility.message);
        if (compatibility.focusField) actions.setFieldError(compatibility.focusField, compatibility.message);
        actions.showMsg(compatibility.message, 'error');
        valid = false;
      }
    }
    return valid;
  }

  return { getBaseVisualizationArgs, getSequenceContext, getCompatibilityValidationContext,
    getVisibleSequencePositionSets, validateStartIndexCompatibility, validateFields };
}
