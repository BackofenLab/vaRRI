import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { root } from './lib/runtime.js';
import { scenes } from './scenes/index.js';

const sha256 = content => createHash('sha256').update(content).digest('hex');
const published = path.join(root, 'doc/demos');

async function verifyManifest(manifest, directory, requireAll = true) {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.clips)) {
    throw new Error('Published demo manifest must use schemaVersion 1 and contain clips.');
  }
  const expected = new Set(scenes.map(scene => scene.id));
  const present = new Set(manifest.clips.map(clip => clip.id));
  if (requireAll && (expected.size !== present.size || [...expected].some(id => !present.has(id)))) {
    throw new Error('Published demo manifest does not contain every registered scene.');
  }
  let aggregate = 0;
  for (const clip of manifest.clips) {
    for (const asset of Object.values(clip.assets)) {
      const content = await fs.readFile(path.join(directory, asset.file));
      if (content.length !== asset.bytes || sha256(content) !== asset.sha256) {
        throw new Error(`${clip.id}: published ${asset.file} does not match its manifest.`);
      }
      aggregate += content.length;
    }
  }
  if (aggregate !== manifest.aggregateBytes) throw new Error('Published aggregate byte count is incorrect.');
}

async function checkPublished() {
  const manifest = JSON.parse(await fs.readFile(path.join(published, 'manifest.json'), 'utf8'));
  await verifyManifest(manifest, published);
  const expected = new Set(['manifest.json', ...manifest.clips.flatMap(clip =>
    Object.values(clip.assets).map(asset => asset.file))]);
  const unexpected = (await fs.readdir(published)).filter(file => !expected.has(file));
  if (unexpected.length) throw new Error(`Unexpected published demo assets: ${unexpected.join(', ')}`);
  console.log(`Published demos passed: ${manifest.clips.length} clips, ${(manifest.aggregateBytes / 1024).toFixed(1)} KiB.`);
}

async function publish(source) {
  const generated = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  if (status || generated.dirty || generated.revision !== revision) {
    throw new Error('Publish requires a clean checkout and demos freshly recorded from HEAD.');
  }
  const clips = [];
  let aggregateBytes = 0;
  for (const sourceClip of generated.clips) {
    const scene = scenes.find(item => item.id === sourceClip.id);
    if (!scene) throw new Error(`Generated demo has no registered scene: ${sourceClip.id}`);
    const assets = {};
    for (const [kind, file, mime] of [['video', sourceClip.file, 'video/webm'],
      ['poster', sourceClip.poster, 'image/png'], ['captions', sourceClip.captions, 'text/vtt']]) {
      const content = await fs.readFile(path.join(source, file));
      assets[kind] = { file, mime, bytes: content.length, sha256: sha256(content) };
      aggregateBytes += content.length;
    }
    clips.push({ id: scene.id, title: scene.title, description: scene.description,
      kind: sourceClip.kind, placements: scene.placements, width: sourceClip.width, height: sourceClip.height,
      duration: sourceClip.duration, fps: sourceClip.fps, codec: sourceClip.codec,
      transcript: sourceClip.cues.map(cue => cue.text), assets });
  }
  const manifest = { schemaVersion: 1, sourceRevision: revision,
    generatedAt: generated.generatedAt, locale: 'en', aggregateBytes, clips };
  const next = path.join(root, 'doc', `.demos-next-${process.pid}`);
  await fs.rm(next, { recursive: true, force: true });
  await fs.mkdir(next, { recursive: true });
  for (const clip of clips) {
    for (const asset of Object.values(clip.assets)) {
      await fs.copyFile(path.join(source, asset.file), path.join(next, asset.file));
    }
  }
  await fs.writeFile(path.join(next, 'manifest.json'), JSON.stringify(manifest) + '\n');
  await verifyManifest(manifest, next);
  const backup = path.join(root, 'doc', `.demos-backup-${process.pid}`);
  await fs.rm(backup, { recursive: true, force: true });
  try {
    await fs.rename(published, backup).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await fs.rename(next, published);
    await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    await fs.rename(backup, published).catch(() => {});
    throw error;
  }
  console.log(`Published ${clips.length} reviewed demos to ${published}.`);
}

const { values } = parseArgs({ options: { check: { type: 'boolean' }, from: { type: 'string' } } });
if (values.check) await checkPublished();
else await publish(path.resolve(root, values.from || 'output/playwright/demos'));
