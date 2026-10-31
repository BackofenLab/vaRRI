import { Capture } from '../recording/lib/capture.js';
import { readingSeconds } from '../recording/lib/presentation.js';
import { verifyActionPauses } from '../recording/lib/timing.js';

function capture(fps = 15) {
  const result = Object.create(Capture.prototype);
  Object.assign(result, { fps, frames: 0, cues: [], timeline: [], pointer: { x: 35, y: 110 },
    page: { locator: () => ({ evaluate: async () => {} }), mouse: { move: async () => {} } },
    frame: async function (count = 1) { this.frames += count; } });
  return result;
}

test.each([10, 15, 20, 30])('a mouse move remains visible for at least 0.5 s before a card at %i fps', async fps => {
  const recording = capture(fps);
  await recording.move({ x: 100, y: 100 });
  const arrived = recording.frames;
  await recording.caption('Now click');
  expect(recording.cues[0].start - arrived / fps).toBeGreaterThanOrEqual(0.5);
  expect(recording.frames - arrived).toBe(Math.ceil(fps / 2));
});

test('existing holds count toward the action pause and preserve instruction reading times', async () => {
  const recording = capture();
  await recording.move({ x: 100, y: 100 });
  await recording.hold(1);
  const held = recording.frames;
  await recording.caption('Click the selected node');
  expect(recording.frames).toBe(held);
  await recording.clearCaption();
  const instruction = recording.timeline.find(entry => entry.type === 'instruction');
  expect(instruction.end - instruction.start).toBeCloseTo(readingSeconds(instruction.text), 5);
});

test('short holds are topped up and the first instruction has no artificial delay', async () => {
  const recording = capture(10);
  await recording.caption('Start here');
  expect(recording.cues[0].start).toBe(0);
  await recording.move({ x: 100, y: 100 });
  const arrived = recording.frames;
  await recording.hold(0.2);
  await recording.caption('Then continue');
  expect(recording.frames - arrived).toBe(5);
});

test('recording validation rejects a card that immediately covers a completed action', () => {
  const action = { type: 'action-end', action: 'click', start: 1 };
  expect(() => verifyActionPauses([action, { type: 'instruction', start: 1.4 }])).toThrow('0.5-second');
  expect(() => verifyActionPauses([action, { type: 'instruction', start: 1.5 }])).not.toThrow();
});
