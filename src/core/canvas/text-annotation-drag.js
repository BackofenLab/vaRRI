import { clientToGraphPosition } from './text-annotation-geometry.js';

/** Pointer ownership stays on the canvas and is cancelled with its render. */
export function attachTextAnnotationDragging(state, move, notify) {
  const { layer, window } = state;
  let active = null;
  const stopMouse = event => event.stopPropagation();
  const stop = () => {
    if (!active) return;
    const pointerId = active.pointerId;
    active = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
    if (layer.hasPointerCapture?.(pointerId)) layer.releasePointerCapture(pointerId);
  };
  const onMove = event => {
    if (!active || active.pointerId !== event.pointerId) return;
    if (!state.entries.has(active.id)) { stop(); return; }
    event.preventDefault();
    const point = clientToGraphPosition(layer, event.clientX, event.clientY);
    move(active.id, { x: point.x + active.offset.x, y: point.y + active.offset.y });
    active.changed = true;
  };
  const onEnd = event => {
    if (!active || active.pointerId !== event.pointerId) return;
    const changed = active.changed;
    stop();
    if (changed) notify();
  };
  const onStart = event => {
    if (event.button !== 0 || active) return;
    const group = event.target.closest('[data-varri-text]');
    if (!group || !layer.contains(group)) return;
    const id = Number(group.getAttribute('data-varri-text'));
    const entry = state.entries.get(id);
    if (!entry?.position) return;
    const point = clientToGraphPosition(layer, event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
    active = { id, pointerId: event.pointerId, changed: false,
      offset: { x: entry.position.x - point.x, y: entry.position.y - point.y } };
    layer.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  };
  layer.addEventListener('pointerdown', onStart);
  // Prevent D3's mouse-based pan from starting after a pointer press on text.
  layer.addEventListener('mousedown', stopMouse);
  layer.addEventListener('touchstart', stopMouse);
  layer.addEventListener('dblclick', stopMouse);
  return () => {
    stop();
    layer.removeEventListener('pointerdown', onStart);
    layer.removeEventListener('mousedown', stopMouse);
    layer.removeEventListener('touchstart', stopMouse);
    layer.removeEventListener('dblclick', stopMouse);
  };
}
