import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { root } from './lib/runtime.js';
import { scenes } from './scenes/index.js';
import { buildPublishedCatalog, verifyPublishedCatalog } from './lib/catalog.js';
import { readSourceState } from './lib/source-state.js';

const published = path.join(root, 'doc/demos');

async function checkPublished() {
  const manifest = JSON.parse(await fs.readFile(path.join(published, 'manifest.json'), 'utf8'));
  await verifyPublishedCatalog(manifest, published, scenes);
  const expected = new Set(['manifest.json', ...manifest.clips.flatMap(clip =>
    Object.values(clip.assets).map(asset => asset.file))]);
  const unexpected = (await fs.readdir(published)).filter(file => !expected.has(file));
  if (unexpected.length) throw new Error(`Unexpected published demo assets: ${unexpected.join(', ')}`);
  console.log(`Published demos passed: ${manifest.clips.length} clips, ${(manifest.aggregateBytes / 1024).toFixed(1)} KiB.`);
}

async function publish(source) {
  const generated = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
  const state = readSourceState(root);
  const manifest = await buildPublishedCatalog(generated, source, state, scenes);
  const next = await fs.mkdtemp(path.join(root, 'doc', '.demos-next-'));
  let replaced = false;
  const backup = path.join(next, 'previous');
  const install = path.join(next, 'install');
  try {
    await fs.mkdir(install);
    for (const clip of manifest.clips) {
      for (const asset of Object.values(clip.assets)) {
        await fs.copyFile(path.join(source, asset.file), path.join(install, asset.file));
      }
    }
    await fs.writeFile(path.join(install, 'manifest.json'), JSON.stringify(manifest) + '\n');
    await verifyPublishedCatalog(manifest, install, scenes);
    await fs.rename(published, backup).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await fs.rename(install, published);
    replaced = true;
  } catch (error) {
    await fs.rename(backup, published).catch(() => {});
    throw error;
  } finally {
    // On an unsuccessful restore preserve the backup for recovery.
    const hasBackup = await fs.stat(backup).then(() => true, () => false);
    if (replaced || !hasBackup) await fs.rm(next, { recursive: true, force: true });
  }
  console.log(`Published ${manifest.clips.length} reviewed demos to ${published}.`);
}

const { values } = parseArgs({ options: { check: { type: 'boolean' }, from: { type: 'string' } } });
if (values.check) await checkPublished();
else await publish(path.resolve(root, values.from || 'output/playwright/demos'));
