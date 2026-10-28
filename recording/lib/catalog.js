import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { serializeCaptions, validateCues, verifyCaptions } from './captions.js';
import { viewport } from '../config.js';

const digest = content => createHash('sha256').update(content).digest('hex');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const assetKinds = { video: ['webm', 'video/webm'], poster: ['png', 'image/png'], captions: ['vtt', 'text/vtt'] };
const maxAssetBytes = 10 * 1024 * 1024;

function validateIdentity(manifest, scenes, revisionField) {
  if (!Array.isArray(manifest.clips) || manifest.clips.length !== scenes.length ||
    new Set(manifest.clips.map(clip => clip.id)).size !== scenes.length ||
    scenes.some(scene => !manifest.clips.some(clip => clip.id === scene.id))) {
    throw new Error('Demo manifest must contain every registered scene exactly once.');
  }
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(manifest[revisionField]) ||
    !nonempty(manifest.generatedAt) || !Number.isFinite(Date.parse(manifest.generatedAt))) {
    throw new Error('Demo manifest requires a source revision and valid generation time.');
  }
}

function validateClip(clip, scene) {
  const kind = scene.stage && scene.stage !== 'canvas' ? 'walkthrough' : 'micro';
  if (clip.title !== scene.title || clip.description !== scene.description || clip.kind !== kind ||
    JSON.stringify(clip.placements) !== JSON.stringify(scene.placements) ||
    clip.width !== viewport.width || clip.height !== viewport.height ||
    !Number.isFinite(clip.duration) || clip.duration <= 0 || clip.duration > 20 ||
    !Number.isInteger(clip.fps) || clip.fps < 10 || clip.fps > 30 || !['vp8', 'vp9'].includes(clip.codec)) {
    throw new Error(`${clip.id}: invalid or stale demo metadata.`);
  }
}

async function readAsset(directory, id, kind, asset) {
  const [extension, mime] = assetKinds[kind];
  if (!asset || asset.file !== `${id}.${extension}` || asset.mime !== mime ||
    !Number.isInteger(asset.bytes) || asset.bytes <= 0 || asset.bytes > maxAssetBytes ||
    !/^[a-f0-9]{64}$/.test(asset.sha256)) {
    throw new Error(`${id}: invalid ${kind} asset metadata.`);
  }
  const location = path.join(directory, asset.file);
  if (!(await fs.lstat(location)).isFile()) throw new Error(`${id}: ${kind} must be a regular file.`);
  const content = await fs.readFile(location);
  if (content.length !== asset.bytes || digest(content) !== asset.sha256) {
    throw new Error(`${id}: ${asset.file} does not match its recorded checksum and byte count.`);
  }
  return content;
}

export async function verifyPublishedCatalog(manifest, directory, scenes) {
  if (manifest.schemaVersion !== 1 || manifest.locale !== 'en') {
    throw new Error('Published demo manifest must use schemaVersion 1 and English captions.');
  }
  validateIdentity(manifest, scenes, 'sourceRevision');
  let aggregate = 0;
  for (const clip of manifest.clips) {
    validateClip(clip, scenes.find(scene => scene.id === clip.id));
    if (!Array.isArray(clip.transcript) || !clip.transcript.length ||
      clip.transcript.some(text => !nonempty(text) || /[\r\n]/.test(text)) ||
      !clip.assets || Object.keys(clip.assets).sort().join(',') !== 'captions,poster,video') {
      throw new Error(`${clip.id}: required assets or transcript are missing.`);
    }
    for (const kind of Object.keys(assetKinds)) {
      const content = await readAsset(directory, clip.id, kind, clip.assets[kind]);
      aggregate += content.length;
      if (kind === 'captions') verifyCaptions(content, clip.transcript, clip.duration);
    }
  }
  if (aggregate !== manifest.aggregateBytes) throw new Error('Published aggregate byte count is incorrect.');
}

export async function buildPublishedCatalog(generated, directory, state, scenes) {
  validateIdentity(generated, scenes, 'revision');
  if (state.dirty || generated.dirty !== false || generated.revision !== state.revision) {
    throw new Error('Publish requires a clean checkout and demos freshly recorded from HEAD.');
  }
  if (!Number.isInteger(generated.sizeBudgetBytes) || generated.sizeBudgetBytes <= 0 ||
    generated.sizeBudgetBytes > maxAssetBytes) throw new Error('Invalid recorded video size budget.');
  const clips = [];
  let aggregateBytes = 0;
  let aggregateWebmBytes = 0;
  for (const clip of generated.clips) {
    const scene = scenes.find(item => item.id === clip.id);
    validateClip(clip, scene);
    validateCues(clip.cues, clip.duration);
    const assets = {
      video: { file: clip.file, mime: 'video/webm', bytes: clip.bytes, sha256: clip.sha256 },
      poster: { file: clip.poster, mime: 'image/png', bytes: clip.posterBytes, sha256: clip.posterSha256 },
      captions: { file: clip.captions, mime: 'text/vtt', bytes: clip.captionsBytes, sha256: clip.captionsSha256 },
    };
    if (clip.bytes > generated.sizeBudgetBytes) throw new Error(`${clip.id}: recorded video exceeds its budget.`);
    for (const kind of Object.keys(assetKinds)) {
      const content = await readAsset(directory, clip.id, kind, assets[kind]);
      if (kind === 'captions' && content.toString('utf8') !== serializeCaptions(clip.cues, clip.duration)) {
        throw new Error(`${clip.id}: recorded captions do not match their cue timeline.`);
      }
      aggregateBytes += content.length;
    }
    aggregateWebmBytes += clip.bytes;
    clips.push({ id: scene.id, title: scene.title, description: scene.description,
      kind: clip.kind, placements: scene.placements, width: clip.width, height: clip.height,
      duration: clip.duration, fps: clip.fps, codec: clip.codec,
      transcript: clip.cues.map(cue => cue.text), assets });
  }
  if (aggregateWebmBytes !== generated.aggregateWebmBytes) throw new Error('Recorded aggregate byte count is incorrect.');
  return { schemaVersion: 1, sourceRevision: state.revision,
    generatedAt: generated.generatedAt, locale: 'en', aggregateBytes, clips };
}
