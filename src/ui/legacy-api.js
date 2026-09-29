// Temporary adapter for the pre-Vue controller. The core itself exports ESM
// without installing globals; phase 3 replaces this with explicit injection.
import vaRRI from '../core/index.js';

globalThis.vaRRI = vaRRI;
