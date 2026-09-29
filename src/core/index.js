// Phase 1 compatibility bridge. Phase 2 replaces the legacy implementation
// with explicit model/canvas imports; the browser already loads native ESM.
import '../vaRRI.js';

const vaRRI = globalThis.vaRRI;
export default vaRRI;
