import { clearTextAnnotations, getTextAnnotations, initializeDefaultTextAnnotations,
  registerTextAnnotation, updateTextAnnotation } from '../model/text-annotations.js';
import { syncTextAnnotationRotation } from './rotation.js';
import { clientToGraphPosition, nucleotideCentroid, terminalPosition } from './text-annotation-geometry.js';
import { attachTextAnnotationDragging } from './text-annotation-drag.js';
import { defaultTextOffset } from './text-annotation-defaults.js';
import { getSequenceNames, setSequenceNames } from '../model/sequence-names.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function defaultAnnotations(session, container, validated) {
  const center = nucleotideCentroid(container.graph);
  const names = getSequenceNames(session.modelState);
  const sequences = validated.sequence2.length ? ['1', '2'] : ['1'];
  return sequences.map(sequence => {
    const anchor = { sequence, end: sequence === '1' ? 'start' : 'end', offset: { x: 0, y: 0 } };
    const terminal = terminalPosition(container.graph, validated, anchor);
    if (!terminal) return null;
    const dx = terminal.x - center.x, dy = terminal.y - center.y;
    const length = Math.hypot(dx, dy);
    const preferred = length > 1e-8 ? { x: dx / length * 24, y: dy / length * 24 } : { x: 0, y: -24 };
    const text = names[`seq${sequence}name`];
    anchor.offset = defaultTextOffset(container, terminal, preferred, 6.4, text);
    // Match the RNA glyph size so tightly fitted short strands retain room for
    // the label beyond their terminal index, without changing the RNA viewport.
    return { text, sequenceNameFor: sequence, bold: true, size: 6.4, anchor,
      position: { x: terminal.x + anchor.offset.x - center.x, y: terminal.y + anchor.offset.y - center.y } };
  }).filter(Boolean);
}

function hasVisibleSequence(item, validated) {
  return !item.sequenceNameFor || !!validated[`sequence${item.sequenceNameFor}`]?.length;
}

function resolveAnchors(session, state) {
  const center = nucleotideCentroid(state.container.graph);
  for (const item of session.annotations.texts.items) {
    if (!hasVisibleSequence(item, state.validated)) continue;
    if (item.anchor) {
      const point = terminalPosition(state.container.graph, state.validated, item.anchor);
      item.position = point ? { x: point.x - center.x, y: point.y - center.y } : null;
    }
  }
  return center;
}

function syncPositions(session, state) {
  const center = resolveAnchors(session, state);
  for (const item of session.annotations.texts.items) {
    const entry = state.entries.get(item.id);
    if (!entry) continue;
    entry.position = hasVisibleSequence(item, state.validated) && item.position &&
      { x: center.x + item.position.x, y: center.y + item.position.y };
    if (entry.position) {
      entry.group.setAttribute('transform', `translate(${entry.position.x},${entry.position.y})`);
    } else { entry.group.remove(); state.entries.delete(item.id); }
  }
}

function sizeTextBar(entry, size) {
  let bounds;
  try { bounds = entry.text.getBBox(); } catch { /* Hidden SVGs may not expose text metrics yet. */ }
  if (!bounds || ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) {
    const width = entry.text.textContent.length * size * 0.6;
    bounds = { x: -width / 2, y: -size / 2, width, height: size };
  }
  entry.background.setAttribute('x', String(bounds.x - 3));
  entry.background.setAttribute('y', String(bounds.y - 2));
  entry.background.setAttribute('width', String(bounds.width + 6));
  entry.background.setAttribute('height', String(bounds.height + 4));
}

/** Redraw this instance's text without replacing the RNA graph or its viewport. */
export function refreshTextAnnotations(session) {
  const state = session.runtime.activeContainer?.varriTextAnnotations;
  if (!state) return 0;
  resolveAnchors(session, state);
  const items = session.annotations.texts.items.filter(item => item.position && hasVisibleSequence(item, state.validated));
  const ids = new Set(items.map(item => item.id));
  for (const [id, entry] of state.entries) {
    if (!ids.has(id)) { entry.group.remove(); state.entries.delete(id); }
  }
  for (const item of items) {
    let entry = state.entries.get(item.id);
    if (!entry) {
      const group = session.dom.createElementNS(SVG_NS, 'g');
      group.setAttribute('data-varri-text', String(item.id));
      if (item.sequenceNameFor) group.setAttribute('data-varri-sequence-name', item.sequenceNameFor);
      group.setAttribute('role', 'img');
      group.style.cursor = 'move';
      group.style.touchAction = 'none';
      const bar = session.dom.createElementNS(SVG_NS, 'g');
      bar.setAttribute('data-varri-text-bar', 'true');
      const background = session.dom.createElementNS(SVG_NS, 'rect');
      background.setAttribute('rx', '3');
      background.setAttribute('fill', 'white');
      background.setAttribute('fill-opacity', '0.85');
      background.setAttribute('stroke', 'none');
      const text = session.dom.createElementNS(SVG_NS, 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.style.userSelect = 'none';
      bar.append(background, text);
      group.appendChild(bar);
      state.layer.appendChild(group);
      entry = { group, bar, background, text, position: null };
      state.entries.set(item.id, entry);
    }
    entry.text.textContent = item.text;
    entry.group.setAttribute('aria-label', item.text);
    entry.text.setAttribute('font-family', 'Tahoma, Geneva, sans-serif');
    entry.text.setAttribute('font-size', String(item.size));
    entry.text.setAttribute('font-weight', item.bold ? 'bold' : 'normal');
    entry.text.setAttribute('font-style', item.italic ? 'italic' : 'normal');
    entry.text.setAttribute('fill', item.color);
    sizeTextBar(entry, item.size);
  }
  syncPositions(session, state);
  syncTextAnnotationRotation(state.container.svg, state.layer);
  return items.length;
}

function moveTextAnnotation(session, state, id, graphPosition) {
  const center = nucleotideCentroid(state.container.graph);
  const annotation = updateTextAnnotation(session.modelState, id, {
    position: { x: graphPosition.x - center.x, y: graphPosition.y - center.y },
  });
  refreshTextAnnotations(session);
  return annotation;
}

/** Place a list item using browser client pixels, independent of pan and rotation. */
export function placeTextAnnotation(session, id, clientX, clientY) {
  const state = session.runtime.activeContainer?.varriTextAnnotations;
  if (!state) throw new Error('Render an RNA structure before placing text annotations.');
  const point = clientToGraphPosition(state.layer, clientX, clientY);
  const annotation = moveTextAnnotation(session, state, id, point);
  state.notify();
  return annotation;
}

/** Install after graph constraints so anchored text follows their final positions. */
export function initializeTextAnnotations(session, container, validated, options = {}) {
  if (!container.svg || !container.plot) return;
  if (Object.hasOwn(validated, 'textAnnotations')) {
    clearTextAnnotations(session.modelState);
    validated.textAnnotations.forEach(item => registerTextAnnotation(session.modelState, item));
  }
  const names = Object.fromEntries(['seq1name', 'seq2name'].filter(key => Object.hasOwn(validated, key))
    .map(key => [key, validated[key]]));
  setSequenceNames(session.modelState, names);
  initializeDefaultTextAnnotations(session.modelState, defaultAnnotations(session, container, validated));
  const layer = session.dom.createElementNS(SVG_NS, 'g');
  layer.setAttribute('data-varri-text-layer', 'true');
  container.plot.appendChild(layer);
  const state = { layer, container, validated, entries: new Map(), window: session.window,
    notify: () => options.onTextAnnotationsChange?.(getTextAnnotations(session.modelState)) };
  container.varriTextAnnotations = state;
  state.disposeDrag = attachTextAnnotationDragging(state,
    (id, position) => moveTextAnnotation(session, state, id, position), state.notify);
  refreshTextAnnotations(session);
  const sync = () => syncPositions(session, state);
  container.force?.on('tick.varriTextAnnotations', sync).on('end.varriTextAnnotations', sync);
  state.notify();
}

export function clearTextAnnotationState(container) {
  const state = container?.varriTextAnnotations;
  if (!state) return;
  state.disposeDrag();
  container.force?.on('tick.varriTextAnnotations', null).on('end.varriTextAnnotations', null);
  delete container.varriTextAnnotations;
}
