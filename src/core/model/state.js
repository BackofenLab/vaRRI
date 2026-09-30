import { DEFAULT_COLORS } from './colors.js';

function createRegistry(label) {
  return { items: [], nextId: 1, label };
}

/** Serializable model data, independent of any renderer or browser document. */
export function createModelState() {
  return {
    colors: { ...DEFAULT_COLORS },
    annotations: {
      subsequences: createRegistry('Highlight'),
      regions: createRegistry('Region highlight'),
      mutations: createRegistry('Mutation'),
    },
  };
}
