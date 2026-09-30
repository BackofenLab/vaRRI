import { errorText, getAnnotationContext, resetAnnotationFields, finishAnnotationChange } from './annotation-helpers.js';

export function normalizeRegionInput(value) {
  if (value === null || value === undefined) return '';
  const normalized = String(value).replace(/\s+/g, '');
  if (normalized && !/^(-?\d+)-(-?\d+)$/.test(normalized)) {
    throw new Error('Region must use the format START-END.');
  }
  return normalized;
}

export function createRegionsController({ api, state, actions }) {
  const fields = state.fields;
  const names = ['region1', 'region2', 'regionColor', 'regionAlpha'];
  function resetRegionForm() { resetAnnotationFields(actions, ['regionEditId', ...names]); }
  function range(fieldId) {
    try { return normalizeRegionInput(fields[fieldId]); }
    catch (error) { error.fieldId = fieldId; throw error; }
  }
  function input() {
    return { sequence1Range: range('region1'), sequence2Range: range('region2'),
      color: fields.regionColor, alpha: Number.parseFloat(String(fields.regionAlpha || '').trim()) };
  }
  function report(error) {
    const message = errorText(error);
    const field = error.fieldId || (/color/i.test(message) ? 'regionColor'
      : /region 2|sequence 2/i.test(message) ? 'region2' : 'region1');
    actions.setFieldError(field, message);
    return false;
  }
  function validateRegionForm() {
    actions.clearFieldErrors(names);
    let values;
    try { values = input(); }
    catch (error) { return report(error); }
    if (!values.sequence1Range || !values.sequence2Range) {
      if (!values.sequence1Range) actions.setFieldError('region1', 'Region 1 is required.');
      if (!values.sequence2Range) actions.setFieldError('region2', 'Region 2 is required.');
      return false;
    }
    const context = getAnnotationContext(actions);
    if (!context) return false;
    try { api.createRegionHighlight(values, context); }
    catch (error) { return report(error); }
    return true;
  }
  function submitRegionForm() {
    if (!validateRegionForm()) return false;
    const context = getAnnotationContext(actions);
    if (!context) return false;
    try {
      if (fields.regionEditId) api.updateRegionHighlight(Number(fields.regionEditId), input(), context);
      else api.registerRegionHighlight(input(), context);
    } catch (error) { return report(error); }
    return finishAnnotationChange(actions, resetRegionForm);
  }
  return { normalizeRegionInput, resetRegionForm, validateRegionForm, submitRegionForm };
}
