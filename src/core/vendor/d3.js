import createD3Runtime from './d3-runtime.js';

const runtimes = new WeakMap();

/** Initialize the pinned D3 engine only when a renderer supplies its Document. */
export default function getD3(document) {
  if (!document?.defaultView) throw new Error('The canvas needs a browser Document');
  if (!runtimes.has(document)) {
    const runtime = {};
    const window = document.defaultView;
    createD3Runtime(runtime, document, window, window.navigator, window.SVGElement);
    runtimes.set(document, runtime);
  }
  return runtimes.get(document);
}
