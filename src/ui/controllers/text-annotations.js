import { errorText, resetAnnotationFields } from './annotation-helpers.js';

const FIELDS = ['textAnnotationText', 'textAnnotationBold', 'textAnnotationItalic',
  'textAnnotationSize', 'textAnnotationColor'];
const DRAG_TYPE = 'application/x-varri-text-annotation';

/** Vue handles form and drag intent; the core owns drawing coordinates. */
export function createTextAnnotationsController({ api, state, actions, colors, document }) {
  const fields = state.fields;
  let draggedId = null;
  const canvas = () => document.getElementById('rendering-canvas');
  function resetTextAnnotationForm() {
    resetAnnotationFields(actions, ['textAnnotationEditId', ...FIELDS]);
  }
  function input() {
    return { text: fields.textAnnotationText, bold: fields.textAnnotationBold,
      italic: fields.textAnnotationItalic, size: Number(fields.textAnnotationSize),
      color: fields.textAnnotationColor };
  }
  function report(error) {
    const message = errorText(error);
    const field = /size/i.test(message) ? 'textAnnotationSize'
      : /color/i.test(message) ? 'textAnnotationColor' : 'textAnnotationText';
    actions.setFieldError(field, message);
    return false;
  }
  function validateTextAnnotationForm() {
    actions.clearFieldErrors(FIELDS);
    const edited = api.getTextAnnotations().find(item => String(item.id) === fields.textAnnotationEditId);
    try { api.createTextAnnotation({ ...input(), sequenceNameFor: edited?.sequenceNameFor || null }); }
    catch (error) { return report(error); }
    return true;
  }
  function refresh() {
    api.refreshTextAnnotations();
    actions.syncAnnotations();
  }
  function submitTextAnnotationForm() {
    if (!validateTextAnnotationForm()) return false;
    try {
      if (fields.textAnnotationEditId) api.updateTextAnnotation(Number(fields.textAnnotationEditId), input());
      else api.registerTextAnnotation(input());
    } catch (error) { return report(error); }
    resetTextAnnotationForm();
    refresh();
    return true;
  }
  function endTextAnnotationDrag() {
    draggedId = null;
    canvas()?.classList.remove('text-annotation-drop-target');
  }
  function isLocalDrag(event) {
    return draggedId !== null && api.getTextAnnotations().some(item => item.id === draggedId)
      && Array.from(event.dataTransfer?.types || []).includes(DRAG_TYPE);
  }
  function textAnnotationAvailable(item) {
    return !item.sequenceNameFor || Boolean(String(fields.sequence || '').split('&')[Number(item.sequenceNameFor) - 1]?.trim());
  }
  function openTextAnnotationDialog(event, title) {
    actions.openDialog('textAnnotationDialog', title, '', event,
      submitTextAnnotationForm, resetTextAnnotationForm);
  }
  return {
    resetTextAnnotationForm, validateTextAnnotationForm, submitTextAnnotationForm,
    textAnnotationAvailable,
    clearTextAnnotationInputs() {
      const id = fields.textAnnotationEditId;
      resetTextAnnotationForm();
      fields.textAnnotationEditId = id;
    },
    addTextAnnotation(event) {
      resetTextAnnotationForm();
      openTextAnnotationDialog(event, 'Add Text Annotation ...');
    },
    editTextAnnotation(item, event) {
      fields.textAnnotationEditId = String(item.id);
      fields.textAnnotationText = item.text;
      fields.textAnnotationBold = item.bold;
      fields.textAnnotationItalic = item.italic;
      fields.textAnnotationSize = String(item.size);
      fields.textAnnotationColor = colors.cssColorToHex(item.color);
      actions.clearFieldErrors(FIELDS);
      openTextAnnotationDialog(event, item.sequenceNameFor
        ? `Edit Sequence ${item.sequenceNameFor} Name ...` : 'Edit Text Annotation ...');
    },
    commitSequenceName(id) {
      try {
        api.setSequenceNames({ [id]: fields[id] });
        refresh();
      } catch (error) { actions.setFieldError(id, errorText(error)); }
    },
    textAnnotationStatus(item) {
      return !textAnnotationAvailable(item) ? 'Sequence absent' : item.position ? 'Positioned' : 'Unpositioned';
    },
    textAnnotationStyle(item) {
      return { color: item.color, fontSize: `${Math.max(12, item.size)}px`,
        fontWeight: item.bold ? 'bold' : 'normal', fontStyle: item.italic ? 'italic' : 'normal' };
    },
    removeTextAnnotation(item) {
      if (!api.removeTextAnnotation(item.id)) return;
      if (fields.textAnnotationEditId === String(item.id)) resetTextAnnotationForm();
      if (draggedId === item.id) endTextAnnotationDrag();
      refresh();
    },
    clearTextAnnotationList() {
      api.clearTextAnnotations();
      resetTextAnnotationForm();
      endTextAnnotationDrag();
      refresh();
    },
    startTextAnnotationDrag(item, event) {
      if (item.position || !textAnnotationAvailable(item) || !event.dataTransfer) { event.preventDefault(); return; }
      draggedId = item.id;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(DRAG_TYPE, String(item.id));
      event.dataTransfer.setData('text/plain', item.text);
    },
    overTextAnnotationCanvas(event) {
      if (!isLocalDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      canvas()?.classList.add('text-annotation-drop-target');
    },
    leaveTextAnnotationCanvas(event) {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        canvas()?.classList.remove('text-annotation-drop-target');
      }
    },
    dropTextAnnotation(event) {
      if (!isLocalDrag(event)) return;
      event.preventDefault();
      const id = draggedId;
      const sameItem = event.dataTransfer.getData(DRAG_TYPE) === String(id);
      endTextAnnotationDrag();
      if (!sameItem) return;
      try { api.placeTextAnnotation(id, event.clientX, event.clientY); actions.syncAnnotations(); }
      catch (error) { actions.showMsg('Text placement error: ' + errorText(error), 'error'); }
    },
    endTextAnnotationDrag,
    disposeTextAnnotations: endTextAnnotationDrag,
  };
}
