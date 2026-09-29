import { errorText, getAnnotationContext, resetAnnotationFields, finishAnnotationChange } from './annotation-helpers.js';

export function createSubsequencesController({ api, state, actions }) {
  const fields = state.fields;
  const names = ['subseqSequence', 'subseqRange', 'subseqColor', 'subseqAlpha'];
  function resetSubseqForm() { resetAnnotationFields(actions, ['subseqEditId', ...names]); }
  function input() {
    return { sequence: fields.subseqSequence, range: String(fields.subseqRange || '').trim(),
      color: fields.subseqColor, alpha: String(fields.subseqAlpha || '').trim() };
  }
  function report(error) {
    const message = errorText(error);
    const field = /must be "1" or "2"/i.test(message) ? 'subseqSequence' : /color/i.test(message) ? 'subseqColor' : 'subseqRange';
    actions.setFieldError(field, message);
    return false;
  }
  function validateSubseqForm() {
    actions.clearFieldErrors(names);
    const values = input();
    if (!values.range) {
      actions.setFieldError('subseqRange', 'Highlight range must not be empty.');
      return false;
    }
    const context = getAnnotationContext(actions);
    if (!context) return false;
    try { api.createSubsequenceHighlight(values, context); }
    catch (error) { return report(error); }
    return true;
  }
  function submitSubseqForm() {
    if (!validateSubseqForm()) return false;
    const context = getAnnotationContext(actions);
    if (!context) return false;
    try {
      if (fields.subseqEditId) api.updateSubsequenceHighlight(Number(fields.subseqEditId), input(), context);
      else api.registerSubsequenceHighlight(input(), context);
    } catch (error) { return report(error); }
    return finishAnnotationChange(actions, resetSubseqForm);
  }
  return { resetSubseqForm, validateSubseqForm, submitSubseqForm };
}
