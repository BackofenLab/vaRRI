import { clientToGraphPosition } from './text-annotation-geometry.js';

/** Rotate positions in screen space so the pointer is the pivot at every zoom. */
export function rotateTargets(targets, pivot, radians) {
  const cosine = Math.cos(radians), sine = Math.sin(radians);
  return targets.map(target => {
    const matrix = target.layer.getScreenCTM();
    const { x, y } = target.position;
    const dx = matrix.a * x + matrix.c * y + matrix.e - pivot.x;
    const dy = matrix.b * x + matrix.d * y + matrix.f - pivot.y;
    return { target, position: clientToGraphPosition(target.layer,
      pivot.x + dx * cosine - dy * sine, pivot.y + dx * sine + dy * cosine) };
  });
}

/** A wheel burst is one undoable edit, and cannot leak into D3/browser zoom. */
export function attachSelectionRotation(container, { targets, positions, refresh, busy, focus }) {
  const { svg } = container;
  const window = svg.ownerDocument.defaultView;
  let records = null, timer = null;
  function finish() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    if (!records) return;
    positions.commit(records);
    records = null;
    refresh();
  }
  function wheel(event) {
    if ((!event.ctrlKey && !event.metaKey) || container.destroyed) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const selected = targets();
    if (busy() || selected.length < 2 || !event.deltaY) return;
    focus();
    if (!records) records = positions.capture(selected);
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1);
    const radians = Math.max(-45, Math.min(45, pixels * 0.15)) * Math.PI / 180;
    positions.apply(rotateTargets(selected, { x: event.clientX, y: event.clientY }, radians));
    refresh();
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(finish, 200);
  }
  svg.addEventListener('wheel', wheel, { capture: true, passive: false });
  return {
    finish,
    dispose() { finish(); svg.removeEventListener('wheel', wheel, true); },
  };
}
