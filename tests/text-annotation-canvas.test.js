import { createCanvasInteractions } from '../src/core/canvas/interactions.js';
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { createSession } from '../src/core/session.js';
import { clearTextAnnotations, getTextAnnotations, registerTextAnnotation,
  updateTextAnnotation } from '../src/core/model/text-annotations.js';
import { initializeTextAnnotations, refreshTextAnnotations, placeTextAnnotation,
  clearTextAnnotationState } from '../src/core/canvas/text-annotations.js';
import { clientToGraphPosition, nucleotideCentroid } from '../src/core/canvas/text-annotation-geometry.js';
import { rotateVisualization } from '../src/core/canvas/rotation.js';
import { getSequenceNames, setSequenceNames } from '../src/core/model/sequence-names.js';

function fixture({ defaults = false } = {}) {
  const dom = new JSDOM('<div id="canvas"><svg><g class="fornac-plot"><g class="rna"></g></g></svg></div>');
  const document = dom.window.document;
  const root = document.getElementById('canvas');
  const session = createSession({ document, root });
  const handlers = new Map();
  const force = { on(name, callback) {
    if (callback) handlers.set(name, callback);
    else handlers.delete(name);
    return force;
  } };
  const container = { svg: root.querySelector('svg'), plot: root.querySelector('.fornac-plot'), force,
    graph: { nodes: [
      { nodeType: 'nucleotide', num: 1, x: -20, y: 0 },
      { nodeType: 'nucleotide', num: 2, x: 0, y: 0 },
      { nodeType: 'nucleotide', num: 3, x: 20, y: 0 },
      { nodeType: 'nucleotide', num: 4, x: 40, y: 0 },
      { nodeType: 'middle', x: 1000, y: 1000 },
      { nodeType: 'label', x: -1000, y: -1000 },
    ] } };
  dom.window.SVGElement.prototype.getBBox = () => ({ x: -5, y: -4, width: 10, height: 8 });
  session.runtime.activeContainer = container;
  container.interactions = createCanvasInteractions(container);
  if (!defaults) clearTextAnnotations(session.modelState);
  const notify = jest.fn();
  initializeTextAnnotations(session, container, { sequence1: 'AA', sequence2: 'UU' }, { onTextAnnotationsChange: notify });
  const layer = container.varriTextAnnotations.layer;
  layer.getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  const tick = () => handlers.get('tick.varriTextAnnotations')();
  const pointer = (target, type, x, y, options = {}) => {
    const event = new dom.window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0,
      clientX: x, clientY: y, ...options });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    target.dispatchEvent(event);
  };
  return { dom, root, session, container, layer, handlers, notify, tick, pointer };
}

test('defaults track visible sequence terminals, detach when placed, and do not return after clear', () => {
  const f = fixture({ defaults: true });
  const defaults = getTextAnnotations(f.session.modelState);
  expect(defaults.map(item => item.text)).toEqual(['Seq. 1', 'Seq. 2']);
  expect(defaults.map(item => item.anchor.end)).toEqual(['start', 'end']);
  const before = f.container.varriTextAnnotations.entries.get(defaults[0].id).position;
  f.container.graph.nodes[0].x -= 10;
  f.tick();
  expect(f.container.varriTextAnnotations.entries.get(defaults[0].id).position.x).toBe(before.x - 10);
  placeTextAnnotation(f.session, defaults[0].id, 50, 30);
  const moved = getTextAnnotations(f.session.modelState)[0];
  expect(moved.anchor).toBeNull();
  expect(moved.sequenceNameFor).toBe('1');
  expect(f.container.varriTextAnnotations.entries.get(moved.id).position).toEqual({ x: 50, y: 30 });
  clearTextAnnotations(f.session.modelState);
  refreshTextAnnotations(f.session);
  expect(f.layer.children).toHaveLength(0);
  clearTextAnnotationState(f.container);
  initializeTextAnnotations(f.session, f.container, { sequence1: 'AA', sequence2: 'UU' });
  expect(getTextAnnotations(f.session.modelState)).toEqual(defaults.map(item => expect.objectContaining({
    id: item.id, sequenceNameFor: item.sequenceNameFor, position: null, anchor: null,
  })));
  f.dom.window.close();
});

test('free text follows global RNA drift while persisted coordinates remain unchanged', () => {
  const f = fixture();
  const item = registerTextAnnotation(f.session.modelState, { text: 'Manual', position: { x: 6, y: 8 } });
  refreshTextAnnotations(f.session);
  expect(nucleotideCentroid(f.container.graph)).toEqual({ x: 10, y: 0 });
  expect(f.container.varriTextAnnotations.entries.get(item.id).position).toEqual({ x: 16, y: 8 });
  f.container.graph.nodes.filter(node => node.nodeType === 'nucleotide').forEach(node => { node.x += 90; node.y -= 20; });
  const notifications = f.notify.mock.calls.length;
  f.tick();
  expect(f.container.varriTextAnnotations.entries.get(item.id).position).toEqual({ x: 106, y: -12 });
  expect(getTextAnnotations(f.session.modelState).find(annotation => annotation.id === item.id).position).toEqual({ x: 6, y: 8 });
  expect(f.notify).toHaveBeenCalledTimes(notifications);
  f.dom.window.close();
});

test('drop coordinates invert combined scale, rotation, and client translation', () => {
  const f = fixture();
  const item = registerTextAnnotation(f.session.modelState, { text: 'Drop' });
  f.layer.getScreenCTM = () => ({ a: 0, b: 2, c: -2, d: 0, e: 100, f: 50 });
  const placed = placeTextAnnotation(f.session, item.id, 40, 90);
  expect(placed.position).toEqual({ x: 10, y: 30 });
  expect(f.container.varriTextAnnotations.entries.get(item.id).position).toEqual({ x: 20, y: 30 });
  f.layer.getScreenCTM = () => ({ a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 });
  expect(() => clientToGraphPosition(f.layer, 0, 0)).toThrow(/unavailable/);
  expect(() => clientToGraphPosition(f.layer, NaN, 0)).toThrow(/finite/);
  f.dom.window.close();
});

test('positioned text preserves grab offset and active drag is cancelled on disposal', () => {
  const f = fixture();
  const item = registerTextAnnotation(f.session.modelState, { text: 'Drag', position: { x: 10, y: 10 } });
  refreshTextAnnotations(f.session);
  const group = f.layer.querySelector('[data-varri-text]');
  f.pointer(group, 'pointerdown', 22, 13);
  f.pointer(f.dom.window, 'pointermove', 52, 33);
  expect(f.container.varriTextAnnotations.entries.get(item.id).position).toEqual({ x: 50, y: 30 });
  const before = getTextAnnotations(f.session.modelState);
  clearTextAnnotationState(f.container);
  f.pointer(f.dom.window, 'pointermove', 90, 90);
  f.pointer(f.dom.window, 'pointerup', 90, 90);
  expect(getTextAnnotations(f.session.modelState)).toEqual(before);
  expect(f.handlers.size).toBe(0);
  f.dom.window.close();
});

test('removing dragged text cancels movement and touch cannot start the plot pan', () => {
  const f = fixture();
  registerTextAnnotation(f.session.modelState, { text: 'Drag', position: { x: 10, y: 10 } });
  refreshTextAnnotations(f.session);
  const group = f.layer.querySelector('[data-varri-text]');
  const pan = jest.fn();
  f.container.svg.addEventListener('touchstart', pan);
  group.dispatchEvent(new f.dom.window.Event('touchstart', { bubbles: true }));
  expect(pan).not.toHaveBeenCalled();
  f.pointer(group, 'pointerdown', 22, 13);
  clearTextAnnotations(f.session.modelState);
  refreshTextAnnotations(f.session);
  f.pointer(f.dom.window, 'pointermove', 52, 33);
  f.pointer(f.dom.window, 'pointerup', 52, 33);
  expect(getTextAnnotations(f.session.modelState).every(item => item.sequenceNameFor && !item.position)).toBe(true);
  expect(f.layer.children).toHaveLength(0);
  f.dom.window.close();
});

test('names redraw in place, cached unnamed input preserves edits, and explicit names win imported text', () => {
  const f = fixture({ defaults: true });
  const first = getTextAnnotations(f.session.modelState)[0];
  placeTextAnnotation(f.session, first.id, 22, 33);
  setSequenceNames(f.session.modelState, { seqName1: 'OxyS' });
  refreshTextAnnotations(f.session);
  expect(f.layer.querySelector('[data-varri-sequence-name="1"] text').textContent).toBe('OxyS');
  const positioned = getTextAnnotations(f.session.modelState)[0];
  expect(positioned).toMatchObject({ id: first.id, sequenceNameFor: '1', anchor: null, position: { x: 12, y: 33 } });
  const rerender = input => {
    clearTextAnnotationState(f.container);
    f.container.plot.querySelectorAll('[data-varri-text-layer]').forEach(layer => layer.remove());
    initializeTextAnnotations(f.session, f.container, input);
  };
  const cached = { sequence1: 'AA', sequence2: 'UU' };
  rerender(cached);
  expect(getSequenceNames(f.session.modelState).seqName1).toBe('OxyS');
  expect(getTextAnnotations(f.session.modelState)[0]).toMatchObject(positioned);
  rerender({ ...cached, seqName1: 'Explicit', textAnnotations: [{ ...positioned, text: 'Imported' }] });
  expect(getSequenceNames(f.session.modelState).seqName1).toBe('Explicit');
  expect(f.container.varriTextAnnotations.layer.querySelector('text').textContent).toBe('Explicit');
  f.dom.window.close();
});

test('temporarily absent sequence labels stay hidden while retaining manual placement and identity', () => {
  const f = fixture({ defaults: true });
  const second = getTextAnnotations(f.session.modelState)[1];
  placeTextAnnotation(f.session, second.id, 50, 10);
  const saved = getTextAnnotations(f.session.modelState)[1];
  f.container.varriTextAnnotations.validated.sequence2 = '';
  refreshTextAnnotations(f.session);
  expect(f.layer.querySelector('[data-varri-sequence-name="2"]')).toBeNull();
  expect(getTextAnnotations(f.session.modelState)[1]).toEqual(saved);
  f.container.varriTextAnnotations.validated.sequence2 = 'UU';
  refreshTextAnnotations(f.session);
  expect(f.layer.querySelector('[data-varri-sequence-name="2"]')).not.toBeNull();
  expect(getTextAnnotations(f.session.modelState)[1]).toEqual(saved);
  f.dom.window.close();
});

test('live changes at a nonzero angle counterrotate text without changing the RNA pivot', () => {
  const f = fixture();
  const item = registerTextAnnotation(f.session.modelState, {
    text: '<tspan>literal</tspan>', position: { x: 1000, y: 1000 }, bold: true, italic: true, color: 'red', size: 21,
  });
  refreshTextAnnotations(f.session);
  rotateVisualization(f.session, 'canvas', 45, { mode: 'absolute' });
  const rotation = f.root.querySelector('[data-varri-rotation-layer]');
  expect(rotation.contains(f.layer)).toBe(false);
  expect(rotation.getAttribute('transform')).toBe('rotate(45 0 0)');
  expect(f.layer.getAttribute('transform')).toBe(rotation.getAttribute('transform'));
  expect(f.layer.previousElementSibling).toBe(rotation);
  const text = f.layer.querySelector('text');
  expect(text.textContent).toBe('<tspan>literal</tspan>');
  expect(text.children).toHaveLength(0);
  expect(text.getAttribute('font-weight')).toBe('bold');
  expect(text.getAttribute('font-style')).toBe('italic');
  expect(text.getAttribute('fill')).toBe('red');
  expect(text.parentNode.getAttribute('transform')).toBe('rotate(-45 0 0)');
  const bar = f.layer.querySelector('rect');
  expect(bar.getAttribute('rx')).toBe('3');
  expect(bar.getAttribute('stroke')).toBe('none');
  expect(bar.getAttribute('width')).toBe('16');
  expect(bar.getAttribute('height')).toBe('12');
  updateTextAnnotation(f.session.modelState, item.id, { text: 'Restyled', size: 30 });
  refreshTextAnnotations(f.session);
  expect(rotation.getAttribute('transform')).toBe('rotate(45 0 0)');
  expect(text.parentNode.getAttribute('transform')).toBe('rotate(-45 0 0)');
  updateTextAnnotation(f.session.modelState, item.id, { position: null });
  refreshTextAnnotations(f.session);
  expect(f.layer.children).toHaveLength(0);
  f.dom.window.close();
});


test('Ctrl-click toggles text without changing placement, and grouped text persists exactly once', () => {
  const f = fixture();
  const first = registerTextAnnotation(f.session.modelState, { text: 'First', position: { x: 10, y: 10 } });
  const second = registerTextAnnotation(f.session.modelState, { text: 'Second', position: { x: 70, y: 20 } });
  refreshTextAnnotations(f.session);
  const groups = [...f.layer.querySelectorAll('[data-varri-text]')];
  const initial = getTextAnnotations(f.session.modelState);
  const toggle = group => {
    f.pointer(group, 'pointerdown', 20, 10, { ctrlKey: true });
    f.pointer(f.dom.window, 'pointerup', 20, 10, { ctrlKey: true });
  };
  toggle(groups[0]);
  toggle(groups[1]);
  toggle(groups[1]);
  expect(f.layer.querySelectorAll('[data-varri-selected]')).toHaveLength(1);
  expect(getTextAnnotations(f.session.modelState)).toEqual(initial);
  toggle(groups[1]);
  f.notify.mockClear();
  f.pointer(groups[1], 'pointerdown', 83, 22);
  f.pointer(f.dom.window, 'pointermove', 103, 52);
  f.pointer(f.dom.window, 'pointerup', 103, 52);
  const placed = getTextAnnotations(f.session.modelState);
  expect(placed.find(item => item.id === first.id).position).toEqual({ x: 30, y: 40 });
  expect(placed.find(item => item.id === second.id).position).toEqual({ x: 90, y: 50 });
  expect(f.notify).toHaveBeenCalledTimes(1);
  expect(placed.every(item => !Object.hasOwn(item, 'selected'))).toBe(true);
  f.dom.window.close();
});

test('pointer cancellation ends an active text gesture and ignores later moves', () => {
  const f = fixture();
  registerTextAnnotation(f.session.modelState, { text: 'Cancelled', position: { x: 10, y: 10 } });
  refreshTextAnnotations(f.session);
  const group = f.layer.querySelector('[data-varri-text]');
  f.pointer(group, 'pointerdown', 22, 13);
  f.pointer(f.dom.window, 'pointermove', 42, 33);
  f.pointer(f.dom.window, 'pointercancel', 42, 33);
  const saved = getTextAnnotations(f.session.modelState);
  f.pointer(f.dom.window, 'pointermove', 80, 90);
  f.pointer(f.dom.window, 'pointerup', 80, 90);
  expect(getTextAnnotations(f.session.modelState)).toEqual(saved);
  f.dom.window.close();
});
