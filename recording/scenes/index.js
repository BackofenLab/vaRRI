import selectNodes from './select-nodes.js';
import moveSelection from './move-selection.js';
import resetPositions from './reset-positions.js';
import releasePositions from './release-positions.js';
import rectangleSelection from './rectangle-selection.js';
import rotateSelection from './rotate-selection.js';
import placeTextAnnotation from './place-text-annotation.js';
import importFasta from './import-fasta.js';
import applyProbabilityProfile from './apply-probability-profile.js';
import storeLoadSession from './store-load-session.js';
import exportPng from './export-png.js';
import addRegionHighlight from './add-region-highlight.js';

// Add a scene module here to include it in --list and the default recording run.
export const scenes = [selectNodes, moveSelection, releasePositions, resetPositions,
  rectangleSelection, rotateSelection, placeTextAnnotation, importFasta,
  applyProbabilityProfile, storeLoadSession, exportPng, addRegionHighlight];

const ids = new Set();
for (const scene of scenes) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(scene.id) || ids.has(scene.id)) {
    throw new Error(`Scene IDs must be unique filename-safe names: ${scene.id}`);
  }
  if (!scene.title || !scene.description || typeof scene.run !== 'function') {
    throw new Error(`Scene ${scene.id} requires a title, description, and run(capture, page).`);
  }
  if (!['canvas', 'full-ui', 'dialog', 'export-dialog'].includes(scene.stage || 'canvas')) {
    throw new Error(`Scene ${scene.id} has an unsupported stage profile.`);
  }
  if (!Array.isArray(scene.placements) || !scene.placements.length) {
    throw new Error(`Scene ${scene.id} requires at least one help placement.`);
  }
  ids.add(scene.id);
}
