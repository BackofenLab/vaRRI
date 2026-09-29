import createD3Runtime from './d3-runtime.js';

const runtimes = new WeakMap();

/** Initialize the pinned D3 engine only when a renderer supplies its Document. */
export default function getD3(document) {
  if (!document?.defaultView) throw new Error('The canvas needs a browser Document');
  if (!runtimes.has(document)) runtimes.set(document, createD3Runtime(document));
  return runtimes.get(document);
}
