import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildPublishedCatalog, verifyPublishedCatalog } from '../recording/lib/catalog.js';
import { serializeCaptions, verifyCaptions } from '../recording/lib/captions.js';
import { readSourceState, recordingSourceState } from '../recording/lib/source-state.js';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const revision = 'a'.repeat(40);
const state = { revision, dirty: false };
const scenes = [{ id: 'move-nodes', title: 'Move nodes', description: 'Move selected nodes.',
  placements: ['docs:move'] }];
let directory;
let generated;

beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'varri-catalog-test-'));
  const cues = [{ start: 0, text: 'Select nodes' }, { start: 1, text: 'Drag the selection' }];
  const video = Buffer.from('verified video fixture');
  const poster = Buffer.from('verified poster fixture');
  const captions = Buffer.from(serializeCaptions(cues, 2));
  await Promise.all([
    fs.writeFile(path.join(directory, 'move-nodes.webm'), video),
    fs.writeFile(path.join(directory, 'move-nodes.png'), poster),
    fs.writeFile(path.join(directory, 'move-nodes.vtt'), captions),
  ]);
  generated = { ...state, generatedAt: '2026-10-28T00:00:00.000Z', sizeBudgetBytes: 512 * 1024,
    aggregateWebmBytes: video.length, clips: [{ ...scenes[0], kind: 'micro',
      width: 960, height: 640, duration: 2, fps: 15, codec: 'vp8', cues,
      file: 'move-nodes.webm', bytes: video.length, sha256: sha256(video),
      poster: 'move-nodes.png', posterBytes: poster.length, posterSha256: sha256(poster),
      captions: 'move-nodes.vtt', captionsBytes: captions.length, captionsSha256: sha256(captions) }] };
});

afterEach(async () => { await fs.rm(directory, { recursive: true, force: true }); });

test('publishes original reviewed identities and permits checking an earlier source revision', async () => {
  const catalog = await buildPublishedCatalog(generated, directory, state, scenes);
  expect(catalog.clips[0].assets.video.sha256).toBe(generated.clips[0].sha256);
  await expect(verifyPublishedCatalog(catalog, directory, scenes)).resolves.toBeUndefined();
});

test.each(['webm', 'png', 'vtt'])('rejects changed %s bytes instead of blessing a new checksum', async extension => {
  const location = path.join(directory, `move-nodes.${extension}`);
  const bytes = await fs.readFile(location);
  bytes[0] ^= 0xff;
  await fs.writeFile(location, bytes);
  await expect(buildPublishedCatalog(generated, directory, state, scenes)).rejects.toThrow('checksum');
});

test.each([null, undefined, true])('rejects unknown or dirty recording provenance: %s', async dirty => {
  generated.dirty = dirty;
  await expect(buildPublishedCatalog(generated, directory, state, scenes)).rejects.toThrow('clean checkout');
});

test('rejects duplicate, missing, or unregistered scene entries', async () => {
  for (const clips of [[...generated.clips, generated.clips[0]], [], [{ ...generated.clips[0], id: 'unknown' }]]) {
    await expect(buildPublishedCatalog({ ...generated, clips }, directory, state, scenes)).rejects.toThrow('exactly once');
  }
});

test('rejects assets outside the source directory before reading them', async () => {
  generated.clips[0].file = '../move-nodes.webm';
  await expect(buildPublishedCatalog(generated, directory, state, scenes)).rejects.toThrow('asset metadata');
});

test('rejects absent required assets and changed production transcripts', async () => {
  const catalog = await buildPublishedCatalog(generated, directory, state, scenes);
  const empty = structuredClone(catalog);
  empty.clips[0].assets = {};
  empty.aggregateBytes = 0;
  await expect(verifyPublishedCatalog(empty, directory, scenes)).rejects.toThrow('required assets');
  catalog.clips[0].transcript[0] = 'A different instruction';
  await expect(verifyPublishedCatalog(catalog, directory, scenes)).rejects.toThrow('transcript');
});

test('rejects rehashed captions that disagree with the recorded instruction timeline', async () => {
  const captions = Buffer.from(serializeCaptions([{ start: 0, text: 'Something else' }], 2));
  await fs.writeFile(path.join(directory, 'move-nodes.vtt'), captions);
  generated.clips[0].captionsBytes = captions.length;
  generated.clips[0].captionsSha256 = sha256(captions);
  await expect(buildPublishedCatalog(generated, directory, state, scenes)).rejects.toThrow('cue timeline');
});

test('enforces recorded size and aggregate budgets', async () => {
  generated.sizeBudgetBytes = 1;
  await expect(buildPublishedCatalog(generated, directory, state, scenes)).rejects.toThrow('exceeds its budget');
  generated.sizeBudgetBytes = 512 * 1024;
  generated.aggregateWebmBytes++;
  await expect(buildPublishedCatalog(generated, directory, state, scenes)).rejects.toThrow('aggregate');
});

test('caption markup is escaped while the transcript preserves its literal text', () => {
  const text = 'Values < 1 & > 0';
  const captions = serializeCaptions([{ start: 0, text }], 2);
  expect(captions).toContain('Values &lt; 1 &amp; &gt; 0');
  expect(() => verifyCaptions(captions, [text], 2)).not.toThrow();
});

test('publishes a longer reading-first clip only within its explicit duration budget', async () => {
  const clip = generated.clips[0];
  clip.duration = 30;
  const captions = Buffer.from(serializeCaptions(clip.cues, clip.duration));
  await fs.writeFile(path.join(directory, clip.captions), captions);
  clip.captionsBytes = captions.length;
  clip.captionsSha256 = sha256(captions);
  await expect(buildPublishedCatalog(generated, directory, state, scenes)).rejects.toThrow('duration exceeds');
  generated.durationBudgetSeconds = 45;
  const catalog = await buildPublishedCatalog(generated, directory, state, scenes);
  await expect(verifyPublishedCatalog(catalog, directory, scenes)).resolves.toBeUndefined();
  generated.durationBudgetSeconds = 121;
  await expect(buildPublishedCatalog(generated, directory, state, scenes)).rejects.toThrow('Invalid recorded duration');
});

test('source provenance fails closed on Git errors', () => {
  const failed = () => ({ status: 1, stdout: '' });
  expect(() => readSourceState(directory, failed)).toThrow('Cannot verify recording source');
  const failedStatus = (_command, args) => args[0] === 'rev-parse'
    ? { status: 0, stdout: revision } : { status: 1, stdout: '' };
  expect(() => readSourceState(directory, failedStatus)).toThrow('Cannot verify recording source');
});

test('source changes during recording cannot be relabeled as clean output from a later commit', () => {
  expect(() => recordingSourceState(state, { revision: 'b'.repeat(40), dirty: false })).toThrow('changed during recording');
  expect(recordingSourceState({ ...state, dirty: true }, state).dirty).toBe(true);
  expect(recordingSourceState(state, { ...state, dirty: true }).dirty).toBe(true);
});
