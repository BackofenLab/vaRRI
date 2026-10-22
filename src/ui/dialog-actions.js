import { nextTick } from 'vue';

export function createDialogActions({ state, actions, document }) {
  const handlers = new Map();
  const cleanup = new Set();
  const window = document.defaultView;
  async function openDialog(id, title, initialValue, event, confirm, cancel) {
    state.dialog = { id, title, value: String(initialValue ?? ''),
      left: event ? `${Math.min(event.clientX, window.innerWidth - 250)}px` : '',
      top: event ? `${Math.min(event.clientY, window.innerHeight - 150)}px` : '' };
    handlers.set(id, { confirm, cancel });
    await nextTick();
    if (!handlers.has(id)) return;
    const dialog = document.getElementById(id);
    if (!dialog) return;
    dialog.returnValue = '';
    if (!dialog.open) {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    const input = dialog.querySelector('input:not([type=hidden]),select,textarea');
    input?.focus();
    if (input?.type !== 'color') input?.select?.();
  }
  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog?.returnValue !== 'ok') handlers.get(id)?.cancel?.();
    handlers.delete(id);
    if (state.dialog.id === id) state.dialog.id = '';
  }
  return {
    openDialog, closeDialog,
    submitDialog(id, event) {
      event.preventDefault();
      const cancel = event.submitter?.value === 'cancel';
      if (!cancel && handlers.get(id)?.confirm?.(state.dialog.value) === false) return;
      const dialog = document.getElementById(id);
      const value = cancel ? 'cancel' : 'ok';
      if (dialog.close) dialog.close(value);
      else { dialog.returnValue = value; dialog.removeAttribute('open'); closeDialog(id); }
    },
    openFastaDialog(event) {
      openDialog('fastaDialog', 'FASTA Data ...', '', event,
        () => actions.submitFastaForm(), () => actions.resetFastaForm());
    },
    openNumberDialog(kind, event) {
      const rotation = kind === 'rotation';
      openDialog('numberDialog', rotation ? 'Rotate ...°' : 'Crop to ... free nt',
        rotation ? state.rotation : state.fields.cropping, event, value => {
          if (!Number.isFinite(Number(value))) return false;
          if (rotation) {
            state.rotation = Number(value);
            state.fields.rotationSlider = '0';
            actions.commitSliderRotation();
          } else {
            state.fields.cropping = String(value);
            actions.runVisualization();
          }
          return true;
        });
    },
    dragDialog(event) {
      if (['BUTTON', 'INPUT'].includes(event.target.tagName)) return;
      const header = event.currentTarget;
      const dialog = header.closest('dialog');
      const rect = dialog.getBoundingClientRect();
      const offsetX = event.clientX - rect.left, offsetY = event.clientY - rect.top;
      header.setPointerCapture?.(event.pointerId);
      const move = event => {
        state.dialog.left = `${event.clientX - offsetX}px`;
        state.dialog.top = `${event.clientY - offsetY}px`;
      };
      const stop = () => {
        if (header.hasPointerCapture?.(event.pointerId)) header.releasePointerCapture(event.pointerId);
        header.removeEventListener('pointermove', move);
        header.removeEventListener('pointerup', stop);
        header.removeEventListener('pointercancel', stop);
        cleanup.delete(stop);
      };
      cleanup.add(stop);
      header.addEventListener('pointermove', move);
      header.addEventListener('pointerup', stop);
      header.addEventListener('pointercancel', stop);
    },
    disposeDialogs() { cleanup.forEach(stop => stop()); handlers.clear(); },
  };
}
