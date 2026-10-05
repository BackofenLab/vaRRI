import { clientToGraphPosition } from './text-annotation-geometry.js';
import { createSelectionOverlay, enclosed, interactionTargets, INTERACTION_TARGET,
  selectionRectangle } from './interaction-selection.js';

/** One pointer owner and one selection for nodes, numbering, and free text. */
export function createCanvasInteractions(container, syncGraph = () => {}) {
  const { svg } = container;
  const window = svg.ownerDocument.defaultView;
  const selected = new Set();
  const overlay = createSelectionOverlay(svg);
  let active = null;
  let hadSelection = false;

  function refresh() {
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
    const { pointerId } = active;
    active = null;
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
    active.moved = true;
    container.hasManualPositions = targets.some(target => target.node) || container.hasManualPositions;
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
      const texts = [];
      let movedNodes = false;
      for (const target of active.targets) {
        if (!target.element.isConnected) continue;
        const current = clientToGraphPosition(target.layer, point.x, point.y);
        const x = target.position.x + current.x - target.origin.x;
        const y = target.position.y + current.y - target.origin.y;
        if (target.node) {
          // Keep the released position for this rendering, including force and
          // rail constraints. No graph positions enter the serializable model.
          Object.assign(target.node, { x, y, px: x, py: y, fx: x, fy: y, vx: 0, vy: 0, fixed: 1 });
          movedNodes = true;
        } else texts.push({ id: target.id, position: { x, y } });
      }
      if (movedNodes) syncGraph();
      // Apply the entire text batch after moving graph nodes: its model frame
      // uses the new nucleotide centroid, avoiding double movement in a group.
      container.varriTextAnnotations?.move(texts);
      if (texts.length) active.changedText = true;
      if (movedNodes && container.options?.animation) container.force.resume();
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
    const changedText = active.changedText;
    stop();
    if (changedText) container.varriTextAnnotations?.notify();
  }

  function onCancel() {
    const changedText = active?.changedText;
    stop();
    if (changedText) container.varriTextAnnotations?.notify();
  }

  function onStart(event) {
    if (event.button !== 0 || active || container.destroyed) return;
    const element = event.target.closest?.(INTERACTION_TARGET);
    const target = interactionTargets(container).find(item => item.element === element);
    const toggle = event.ctrlKey || event.metaKey;
    if (!target && !toggle) return; // Ordinary background gestures belong to zoom/pan.
    event.preventDefault();
    event.stopPropagation();
    active = { target, toggle, pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY }, moved: false, changedText: false };
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
  svg.addEventListener('pointerdown', onStart);
  svg.addEventListener('lostpointercapture', onCancel);
  for (const type of ['mousedown', 'touchstart', 'dblclick']) svg.addEventListener(type, stopPan, true);
  return {
    refresh,
    cancel: stop,
    clear() { stop(); selected.clear(); refresh(); },
    dispose() {
      stop();
      selected.clear();
      refresh();
      overlay.dispose();
      svg.removeEventListener('pointerdown', onStart);
      svg.removeEventListener('lostpointercapture', onCancel);
      for (const type of ['mousedown', 'touchstart', 'dblclick']) svg.removeEventListener(type, stopPan, true);
    },
  };
}
