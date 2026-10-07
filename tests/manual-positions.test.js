import { jest } from '@jest/globals';
import { createManualPositions } from '../src/core/canvas/manual-positions.js';

function fixture(animation = false) {
  const node = { x: 2, y: 3, px: 2, py: 3, fixed: 0, vx: 0, vy: 0 };
  const other = { ...node, x: 20, px: 20, fixed: 1, fx: 20, fy: 3 };
  const force = { resume: jest.fn() };
  const container = { options: { animation }, graph: { nodes: [node, other] }, force };
  const sync = jest.fn();
  const positions = createManualPositions(container, sync);
  const target = node => ({ node, element: { isConnected: true } });
  const edit = (node, x, y) => {
    const records = positions.capture([target(node)]);
    positions.apply([{ target: target(node), position: { x, y } }]);
    positions.commit(records);
  };
  return { node, other, container, force, positions, target, edit };
}

test.each([false, true])('reset releases originally free nodes and preserves prior fixation, force=%s', animation => {
  const f = fixture(animation);
  f.edit(f.node, 10, 12);
  f.edit(f.node, 15, 18);
  f.edit(f.other, 25, 30);
  expect(f.positions.count).toBe(2);
  expect(f.positions.reset([f.target(f.node)])).toBe(true);
  expect(f.node).toMatchObject({ x: 2, y: 3, fixed: 0 });
  expect(f.node.fx).toBeUndefined();
  expect(f.node.fy).toBeUndefined();
  expect(f.other).toMatchObject({ x: 25, y: 30, fixed: 1 });
  expect(f.positions.count).toBe(1);
  f.positions.reset([f.target(f.other)]);
  expect(f.other).toMatchObject({ x: 20, y: 3, fixed: 1, fx: 20, fy: 3 });
  expect(f.positions.count).toBe(0);
  expect(f.force.resume).toHaveBeenCalledTimes(animation ? 5 : 0);
});

test('undo restores successive gestures and undoing reset retains the first pre-edit position', () => {
  const f = fixture();
  f.edit(f.node, 10, 12);
  f.edit(f.node, 15, 18);
  f.positions.reset([f.target(f.node)]);
  f.positions.undo();
  expect(f.node).toMatchObject({ x: 15, y: 18, fixed: 1 });
  expect(f.positions.count).toBe(1);
  f.positions.undo();
  expect(f.node).toMatchObject({ x: 10, y: 12, fixed: 1 });
  f.positions.reset([f.target(f.node)]);
  expect(f.node).toMatchObject({ x: 2, y: 3, fixed: 0 });
});

test('undoing the first drag removes its fixation, and a new render discards history', () => {
  const f = fixture();
  f.edit(f.node, 10, 12);
  expect(f.positions.undo()).toBe(true);
  expect(f.node).toMatchObject({ x: 2, y: 3, fixed: 0 });
  expect(f.positions.count).toBe(0);
  expect(f.positions.canUndo).toBe(false);
  f.edit(f.node, 30, 40);
  f.positions.clear();
  expect(f.positions.undo()).toBe(false);
  expect(f.positions.count).toBe(0);
  expect(f.container.hasManualPositions).toBe(false);
});

test.each([false, true])('release keeps current positions and resumes only animated layouts, force=%s', animation => {
  const f = fixture(animation);
  f.edit(f.node, 10, 12);
  f.edit(f.other, 25, 30);
  f.force.resume.mockClear();
  expect(f.positions.release([f.target(f.node), { id: 'text' }])).toBe(true);
  expect(f.node).toMatchObject({ x: 10, y: 12, px: 10, py: 12, fx: null, fy: null, fixed: 0, vx: 0, vy: 0 });
  expect(f.other).toMatchObject({ x: 25, y: 30, fixed: 1, fx: 25, fy: 30 });
  expect(f.positions.count).toBe(1);
  expect(f.force.resume).toHaveBeenCalledTimes(animation ? 1 : 0);
  // A force tick after release must not change what Undo restores.
  Object.assign(f.node, { x: 9, y: 11 });
  expect(f.positions.undo()).toBe(true);
  expect(f.node).toMatchObject({ x: 10, y: 12, fixed: 1, fx: 10, fy: 12 });
  expect(f.positions.count).toBe(2);
  f.positions.reset([f.target(f.node)]);
  expect(f.node).toMatchObject({ x: 2, y: 3, fixed: 0 });
});

test('release can unfix previously fixed nodes, and a later drag gets a new reset origin', () => {
  const f = fixture();
  expect(f.positions.release([f.target(f.other)])).toBe(true);
  expect(f.other).toMatchObject({ x: 20, y: 3, fixed: 0, fx: null, fy: null });
  f.positions.undo();
  expect(f.other).toMatchObject({ x: 20, y: 3, fixed: 1, fx: 20, fy: 3 });
  f.edit(f.node, 10, 12);
  f.positions.release([f.target(f.node)]);
  f.edit(f.node, 30, 40);
  f.positions.reset([f.target(f.node)]);
  expect(f.node).toMatchObject({ x: 10, y: 12, fixed: 0, fx: null, fy: null });
  expect(f.positions.count).toBe(0);
});

test('release of free nodes or text does not add undo history or start a force', () => {
  const f = fixture(true);
  expect(f.positions.release([f.target(f.node), { id: 'text' }])).toBe(false);
  expect(f.positions.release([])).toBe(false);
  expect(f.positions.canUndo).toBe(false);
  expect(f.force.resume).not.toHaveBeenCalled();
});
