import { createApp, nextTick } from 'vue';
import { createVaRRI } from '../core/index.js';
import App from './components/app.js';
import { VIEWER_CONTEXT } from './components/context.js';
import EXAMPLES from './examples-data.js';
import { createColorHelpers } from './colors.js';
import { createViewerState, createStateActions } from './state.js';
import { createFastaController } from './controllers/fasta.js';
import { createProfilesController } from './controllers/profiles.js';
import { createValidationController } from './controllers/validation.js';
import { createAnnotationControllers } from './controllers/annotations.js';
import { createAnnotationActions } from './annotation-actions.js';
import { createRenderActions } from './render-actions.js';
import { createNavigationActions } from './navigation-actions.js';
import { createDialogActions } from './dialog-actions.js';
import { createFieldActions } from './field-actions.js';

/** Mount a complete viewer. Only field/annotation DTOs enter Vue's store. */
export function createViewerApp(options = {}) {
  const document = options.document || globalThis.document;
  const root = options.root || document?.getElementById('app');
  if (!root) throw new Error('The viewer needs an #app root.');
  const api = options.api || createVaRRI({ document });
  const examples = options.examples || EXAMPLES;
  const colors = createColorHelpers(document);
  const { state, defaults, initialColors } = createViewerState(api, colors);
  const actions = {};
  const context = { api, state, defaults, initialColors, actions, document, examples, colors };
  [createStateActions, createFastaController, createProfilesController,
    createValidationController, createAnnotationControllers, createAnnotationActions,
    createRenderActions, createNavigationActions, createDialogActions, createFieldActions]
    .forEach(factory => Object.assign(actions, factory(context)));
  const app = createApp(App);
  app.provide(VIEWER_CONTEXT, { state, actions, examples, colors });
  app.mount(root);
  actions.observeBackdrops();
  const outsideClick = event => {
    if (state.exampleOpen && !document.getElementById('exampleDropdown')?.contains(event.target)) state.exampleOpen = false;
  };
  document.addEventListener('click', outsideClick);
  let unmounted = false;
  const ready = (async () => {
    actions.clearAll();
    const params = new URLSearchParams(document.defaultView.location.search);
    if (params.size) {
      actions.loadAllUrlParameters(params);
      await nextTick();
      if (unmounted) return;
      await actions.runVisualization();
    } else await actions.loadExample('2mol');
    await nextTick();
  })();
  return {
    app, state, actions, ready,
    unmount() {
      if (unmounted) return;
      unmounted = true;
      actions.cancelRendering(); actions.disposeBackdrops(); actions.disposeDialogs(); actions.disposeNavigation();
      document.removeEventListener('click', outsideClick);
      app.unmount();
    },
  };
}
