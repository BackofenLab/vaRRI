export const errorText = error => error?.message || String(error);

export function getAnnotationContext(actions) {
  try { return actions.getSequenceContext(); }
  catch (error) {
    actions.showMsg('Please fix sequence/structure inputs first: ' + errorText(error), 'error');
    return null;
  }
}

export function resetAnnotationFields(actions, names) {
  actions.resetFields(names);
  actions.clearFieldErrors(names);
}

export function finishAnnotationChange(actions, reset) {
  reset();
  actions.syncAnnotations();
  actions.runVisualization();
  return true;
}
