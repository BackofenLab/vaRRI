import { createManualPositions } from './manual-positions.js';
import { attachSelectionRotation } from './selection-rotation.js';
import { clientToGraphPosition } from './text-annotation-geometry.js';
import { createSelectionOverlay, enclosed, interactionTargets, INTERACTION_TARGET,
  selectionRectangle } from './interaction-selection.js';

/** One pointer owner and one selection for nodes, numbering, and free text. */
export function createCanvasInteractions(container, syncGraph = () => {}) {
  const { svg } = container;
  const host = container.element || svg;
  const window = svg.ownerDocument.defaultView;
  const selected = new Set();
  const overlay = createSelectionOverlay(svg);
  let active = null;
  let hadSelection = false;
  let lastStatus = '';
  const positions = createManualPositions(container, syncGraph);
  const selectedTargets = () => selected.size
    ? interactionTargets(container).filter(target => selected.has(target.element)) : [];
  const status = () => {
    const nodes = selectedTargets().filter(target => target.node);
    return { movedCount: positions.count, selectedNodeCount: nodes.length,
      selectedMovedCount: nodes.filter(target => positions.has(target.node)).length, canUndo: positions.canUndo };
  };
  function notify() {
    const value = status();
    const key = JSON.stringify(value);
    if (key === lastStatus) return;
    lastStatus = key;
    container.options?.onCanvasInteractionChange?.(value);
  }
  const focus = () => {
    host.setAttribute('data-varri-pointer-focus', 'true');
    if (!host.hasAttribute('tabindex')) host.setAttribute('tabindex', '0');
    host.focus({ preventScroll: true });
  };
  const rotation = attachSelectionRotation(container, {
    targets: selectedTargets, positions, refresh, busy: () => !!active, focus,
  });

  function refresh() {
    notify();
    if (!selected.size && !hadSelection && !active?.rectangle) return;
    const targets = interactionTargets(container);
    const live = new Set(targets.map(target => target.element));
    for (const element of selected) if (!live.has(element)) selected.delete(element);
    for (const target of targets) {
      const value = selected.has(target.element);
      if (target.node) target.node.selected = value;
      if (value) target.element.setAttribute('data-varri-selected', 'true');
      else target.element.removeAttribute('data-varri-selected');
    }
    overlay.draw(selected, active?.rectangle);
    hadSelection = selected.size > 0 || !!active?.rectangle;
  }

  function stop() {
    if (!active) return;
    const { pointerId, records } = active;
    active = null;
    positions.commit(records);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('blur', onCancel);
    if (svg.hasPointerCapture?.(pointerId)) svg.releasePointerCapture(pointerId);
    refresh();
  }

  function beginMove() {
    if (!selected.has(active.target.element)) selected.clear();
    const targets = selected.size ? interactionTargets(container).filter(target => selected.has(target.element))
      : [active.target];
    active.targets = targets.map(target => ({ ...target,
      origin: clientToGraphPosition(target.layer, active.start.x, active.start.y) }));
    active.records = positions.capture(targets);
    active.moved = true;
  }

  function onMove(event) {
    if (!active || event.pointerId !== active.pointerId || container.destroyed) return;
    const point = { x: event.clientX, y: event.clientY };
    if (!active.moved && Math.hypot(point.x - active.start.x, point.y - active.start.y) < 2) return;
    event.preventDefault();
    if (!active.target) {
      active.moved = true;
      active.rectangle = selectionRectangle(active.start, point);
      selected.clear();
      interactionTargets(container).filter(target => enclosed(target.element, active.rectangle))
        .forEach(target => selected.add(target.element));
    } else {
      if (!active.target.element.isConnected) { stop(); return; }
      if (!active.moved) beginMove();
      const updates = active.targets.map(target => {
        const current = clientToGraphPosition(target.layer, point.x, point.y);
        return { target, position: {
          x: target.position.x + current.x - target.origin.x,
          y: target.position.y + current.y - target.origin.y,
        } };
      });
      positions.apply(updates);
    }
    refresh();
  }

  function onEnd(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    if (!active.moved && active.target && active.toggle) {
      const element = active.target.element;
      if (selected.has(element)) selected.delete(element);
      else selected.add(element);
    }
    if (!active.moved && (!active.target || !active.toggle)) selected.clear();
    stop();
  }

  function onCancel(event) {
    if (event?.pointerId !== undefined && event.pointerId !== active?.pointerId) return;
    stop();
  }

  function onStart(event) {
    if (event.button !== 0 || active || container.destroyed) return;
    const element = event.target.closest?.(INTERACTION_TARGET);
    const target = interactionTargets(container).find(item => item.element === element);
    const toggle = event.ctrlKey || event.metaKey;
    if (!target && !toggle) return; // Ordinary background gestures belong to zoom/pan.
    rotation.finish();
    focus();
    if (!target || (!toggle && !selected.has(target.element))) selected.clear();
    event.preventDefault();
    event.stopPropagation();
    active = { target, toggle, pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY }, moved: false };
    refresh();
    svg.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onCancel);
  }

  const stopPan = event => {
    if (active || event.target.closest?.(INTERACTION_TARGET) || event.ctrlKey || event.metaKey) {
      event.stopImmediatePropagation();
    }
  };
  function undo() {
    if (container.destroyed) return false;
    stop(); rotation.finish();
    const changed = positions.undo();
    refresh();
    return changed;
  }
  const keydown = event => {
    clearPointerFocus();
    if (event.key.toLowerCase() !== 'z' || (!event.ctrlKey && !event.metaKey) || event.shiftKey || event.altKey ||
      event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (undo()) { event.preventDefault(); event.stopPropagation(); }
  };
  const clearPointerFocus = () => host.removeAttribute('data-varri-pointer-focus');
  host.addEventListener('blur', clearPointerFocus);
  host.addEventListener('keydown', keydown);
  svg.addEventListener('pointerdown', onStart);
  svg.addEventListener('lostpointercapture', onCancel);
  for (const type of ['mousedown', 'touchstart', 'dblclick']) svg.addEventListener(type, stopPan, true);
  return {
    refresh, status, undo,
    cancel() { stop(); rotation.finish(); },
    selectMoved() {
      if (container.destroyed) return;
      stop(); rotation.finish(); selected.clear();
      interactionTargets(container).filter(target => positions.has(target.node))
        .forEach(target => selected.add(target.element));
      refresh();
    },
    resetSelected() {
      if (container.destroyed) return false;
      stop(); rotation.finish();
      const changed = positions.reset(selectedTargets());
      refresh();
      return changed;
    },
    releaseSelected() {
      if (container.destroyed) return false;
      stop(); rotation.finish();
      const changed = positions.release(selectedTargets());
      refresh();
      return changed;
    },
    clear() { stop(); rotation.finish(); selected.clear(); positions.clear(); refresh(); },
    dispose() {
      stop();
      rotation.dispose();
      positions.clear();
      host.removeEventListener('keydown', keydown);
      host.removeEventListener('blur', clearPointerFocus);
      clearPointerFocus();
      selected.clear();
      refresh();
      overlay.dispose();
      svg.removeEventListener('pointerdown', onStart);
      svg.removeEventListener('lostpointercapture', onCancel);
      for (const type of ['mousedown', 'touchstart', 'dblclick']) svg.removeEventListener(type, stopPan, true);
    },
  };
}
