import selectNodes from './select-nodes.js';
import moveSelection from './move-selection.js';
import resetPositions from './reset-positions.js';

// Add a scene module here to include it in --list and the default recording run.
export const scenes = [selectNodes, moveSelection, resetPositions];

const ids = new Set();
for (const scene of scenes) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(scene.id) || ids.has(scene.id)) {
    throw new Error(`Scene IDs must be unique filename-safe names: ${scene.id}`);
  }
  if (!scene.title || !scene.description || typeof scene.run !== 'function') {
    throw new Error(`Scene ${scene.id} requires a title, description, and run(capture, page).`);
  }
  ids.add(scene.id);
}
