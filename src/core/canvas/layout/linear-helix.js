import { LINEAR_RRI_LINK_TYPE, LINEAR_STRUCTURE_LINK_TYPE } from './constants.js';
import { createLinearHelixDomCache, syncLinearHelixDom } from './dom-sync.js';
import { collectLinearHelixIndexLabelBiases, nudgeLinearHelixIndexLabels } from './label-bias.js';
import { orientLinearRriInteractionHorizontally } from './orientation.js';
import { createLinearHelixRailTemplate, projectLinearHelixRailTemplate } from './rails.js';
import { collectLinearHelixSpanConstraints } from './spans.js';
import { listRriHelixPairGroups, listStructureHelixPairGroups } from '../../model/helix-groups.js';
import { getLinearRriConstraintSpecs, getLinearStructureConstraintSpecs } from '../../model/loops.js';

export function clearLinearHelixConstraintState(container) {
  const hadConstraintState = !!container && (Object.prototype.hasOwnProperty.call(container, 'varriLinearHelixConstraints') || Object.prototype.hasOwnProperty.call(container, 'varriLinearHelixTemplates') || Object.prototype.hasOwnProperty.call(container, 'varriLinearHelixLabelBiases'));
  if (hadConstraintState && container.force && typeof container.force.on === 'function') {
    container.force.on('tick.varriLinearHelix', null);
    container.force.on('end.varriLinearHelix', null);
  }
  delete container?.varriLinearHelixConstraints;
  delete container?.varriLinearHelixTemplates;
  delete container?.varriLinearHelixLabelBiases;
}

/**
 * Apply rigid, invisible two-rail constraints for the requested RRI and/or
 * intramolecular helices, then restart the live D3 force once.
 *
 * @param {Object} container  Live graph canvas.
 * @param {Object} v  Validated parameter dictionary.
 * @param {{rri?:boolean,structure?:boolean}} [options]
 * @returns {number} Number of measured same-strand loop-span constraints.
 */
export function applyLinearHelixSprings(session, container, v, options = {}) {
  clearLinearHelixConstraintState(container);
  const graph = container && container.graph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) return 0;
  const constraints = [];
  const groups = [];
  if (options.rri && v.molecules === '2') {
    constraints.push(...collectLinearHelixSpanConstraints(container, getLinearRriConstraintSpecs(v), LINEAR_RRI_LINK_TYPE));
    groups.push(...listRriHelixPairGroups(v));
  }
  if (options.structure) {
    constraints.push(...collectLinearHelixSpanConstraints(container, getLinearStructureConstraintSpecs(v), LINEAR_STRUCTURE_LINK_TYPE));
    groups.push(...listStructureHelixPairGroups(v));
  }
  const templates = groups.map(group => createLinearHelixRailTemplate(container, group)).filter(Boolean);
  if (templates.length === 0) return 0;
  const constrainedNodes = new Set(templates.flatMap(template => template.points.map(point => point.node)));
  const activeConstraints = constraints.filter(constraint => constrainedNodes.has(constraint.source) && constrainedNodes.has(constraint.target));
  container.varriLinearHelixConstraints = activeConstraints;
  container.varriLinearHelixTemplates = templates;
  const labelBiases = collectLinearHelixIndexLabelBiases(container, v, templates);
  container.varriLinearHelixLabelBiases = labelBiases;
  const rriTemplate = options.rri ? templates.find(template => template.kind === 'rri') || null : null;
  const domCache = createLinearHelixDomCache(session, graph, templates, labelBiases, !!rriTemplate);
  const enforceAndSync = () => {
    templates.forEach(projectLinearHelixRailTemplate);
    if (rriTemplate) {
      orientLinearRriInteractionHorizontally(graph, rriTemplate, templates);
    }
    nudgeLinearHelixIndexLabels(labelBiases);
    syncLinearHelixDom(domCache);
  };
  let hasRefittedAtRest = false;
  const enforceSyncAndRefit = () => {
    enforceAndSync();
    if (!hasRefittedAtRest && typeof container.centerView === 'function') {
      hasRefittedAtRest = true;
      container.centerView();
    }
  };
  enforceAndSync();
  if (container.force) {
    if (typeof container.force.on === 'function') {
      container.force.on('tick.varriLinearHelix', () => enforceAndSync());
      // The final projection can extend beyond the bounds measured by
      // applyModifications while the force is still moving. Refit once
      // at rest so asymmetric bulges are not clipped at the viewport.
      container.force.on('end.varriLinearHelix', enforceSyncAndRefit);
    }
    if (typeof container.force.start === 'function') {
      container.force.start();
    }
  }
  return activeConstraints.length;
}
