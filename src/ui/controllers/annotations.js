import { createSubsequencesController } from './subsequences.js';
import { createRegionsController } from './regions.js';
import { createMutationsController } from './mutations.js';
import { createTextAnnotationsController } from './text-annotations.js';

/** Register form actions locally; Vue owns list rendering and field bindings. */
export function createAnnotationControllers(context) {
  return {
    ...createSubsequencesController(context),
    ...createRegionsController(context),
    ...createMutationsController(context),
    ...createTextAnnotationsController(context),
  };
}
