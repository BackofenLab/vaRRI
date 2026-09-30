import { errorText, getAnnotationContext, resetAnnotationFields, finishAnnotationChange } from './annotation-helpers.js';

export function createMutationsController({ api, state, actions }) {
  const fields = state.fields;
  const names = ['mutationSequence', 'mutationPosition', 'mutationBase', 'mutationColor'];
  function resetMutationForm() { resetAnnotationFields(actions, ['mutationEditId', ...names]); }
  function input() {
    return { sequence: fields.mutationSequence, position: api.validateOffset(String(fields.mutationPosition || '').trim()),
      replacement: String(fields.mutationBase || '').trim(), color: fields.mutationColor };
  }
  function report(error, submitting = false) {
    const message = errorText(error);
    const field = submitting && /sequence/i.test(message) ? 'mutationSequence'
      : /position|index/i.test(message) ? 'mutationPosition'
      : /replacement|reference|nucleotide|single letter/i.test(message) ? 'mutationBase' : 'mutationColor';
    actions.setFieldError(field, message);
    return false;
  }
  function validateMutationForm() {
    actions.clearFieldErrors(names);
    const context = getAnnotationContext(actions);
    if (!context) return false;
    let valid = true;
    const position = String(fields.mutationPosition || '').trim();
    if (!position) {
      actions.setFieldError('mutationPosition', 'Mutation position must not be empty.');
      valid = false;
    } else {
      try { api.validateOffset(position); }
      catch (error) { actions.setFieldError('mutationPosition', errorText(error)); valid = false; }
    }
    if (!String(fields.mutationBase || '').trim()) {
      actions.setFieldError('mutationBase', 'Replacement base must not be empty.');
      valid = false;
    }
    if (!valid) return false;
    try { api.createPointMutation(input(), context); }
    catch (error) { return report(error); }
    return true;
  }
  function submitMutationForm() {
    if (!validateMutationForm()) return false;
    const context = getAnnotationContext(actions);
    if (!context) return false;
    try {
      if (fields.mutationEditId) api.updatePointMutation(Number(fields.mutationEditId), input(), context);
      else api.registerPointMutation(input(), context);
    } catch (error) { return report(error, true); }
    return finishAnnotationChange(actions, resetMutationForm);
  }
  return { resetMutationForm, validateMutationForm, submitMutationForm };
}
