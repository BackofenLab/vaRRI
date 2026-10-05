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
