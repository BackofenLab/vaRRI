import { inject } from 'vue';

export const VIEWER_CONTEXT = Symbol('vaRRI viewer');

export function viewerComponent(name, template, components = {}) {
  return {
    name, template, components,
    setup() { return inject(VIEWER_CONTEXT); },
  };
}
