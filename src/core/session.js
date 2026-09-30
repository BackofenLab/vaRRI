import { createModelState } from './model/state.js';

/**
 * Mutable state belongs to a single API instance. Pure model algorithms never
 * import this module; model operations receive only its plain modelState data.
 * Canvas functions receive the complete session explicitly.
 * The document is resolved lazily so importing the library also works in Node.
 */
export function createSession(options = {}) {
  const modelState = createModelState();
  const session = {
    modelState,
    // Canvas helpers share the model palette without passing their session back.
    colors: modelState.colors,
    annotations: modelState.annotations,
    runtime: {
      animationFrameId: null,
      renderTimeoutId: null,
      pendingRenderResolve: null,
      activeContainer: null,
    },
    root: options.root || null,
    createCanvas: options.createCanvas,
    get document() {
      return options.document || session.root?.ownerDocument || globalThis.document;
    },
    get window() {
      return session.document?.defaultView || globalThis.window;
    },
    resolveRoot(target) {
      if (target && typeof target === 'object' && target.querySelector) return target;
      const doc = session.document;
      if (!doc) throw new Error('Rendering requires a browser document.');
      const value = String(target);
      const byId = doc.getElementById(value.replace(/^#/, ''));
      const root = byId || doc.querySelector(value);
      if (!root) throw new Error(`Rendering container not found: ${value}`);
      return root;
    },
  };
  // Use the rendering document's scheduler, including when embedded in an
  // iframe. Wrappers resolve the current window lazily, like the DOM adapter.
  session.scheduler = Object.fromEntries(
    ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'].map(name => [
      name, (...args) => {
        const owner = typeof session.window?.[name] === 'function' ? session.window : globalThis;
        return owner[name](...args);
      },
    ])
  );
  const scopedDocument = {
    querySelector: selector => (session.root || session.document)?.querySelector(selector) || null,
    querySelectorAll: selector => (session.root || session.document)?.querySelectorAll(selector) || [],
    getElementsByClassName: name => {
      const root = session.root || session.document;
      return root?.getElementsByClassName?.(name) || root?.querySelectorAll?.(`.${name}`) || [];
    },
    getElementById(id) {
      const element = typeof id === 'object' ? id : session.document?.getElementById(String(id).replace(/^#/, ''));
      return !session.root || element === session.root || session.root.contains(element) ? element : null;
    },
    createElement: (...args) => session.document.createElement(...args),
    createElementNS: (...args) => session.document.createElementNS(...args),
    get body() { return session.document.body; },
  };
  Object.defineProperty(session, 'dom', {
    get: () => session.document ? scopedDocument : undefined,
  });
  return session;
}
