import { visualiseAccessibility } from './accessibility.js';
import { setLabelsId, setLinksId } from './dom.js';
import { setIndexLabels, updateLinkTooltips, updateNodeToolTips } from './labels.js';
import { applyLinearHelixSprings, clearLinearHelixConstraintState } from './layout/linear-helix.js';
import { applyPseudoknotLinkStrength, relaxForceGraphScaffold } from './layout/scaffold.js';
import { applyRegionHighlights, applySubsequenceHighlights, backgroundhighlightBasepairs, backgroundhighlightRegion } from './overlays.js';
import { applyPointMutations, changeBackgroundColor, highlightBasepairs, highlightRegion, styleBasepairs } from './styling.js';
import { clearGeneratedRegionHighlights } from '../model/regions.js';
import { createGraphCanvas } from './graph/index.js';
import { clearTextAnnotationState, initializeTextAnnotations } from './text-annotations.js';

/**
 * Stop the active force simulation and cancel delayed/animation-frame work.
 * Pending render promises resolve as cancelled.
 */
export function cancelActiveRender(session) {
  if (session.runtime.animationFrameId !== null) {
    session.scheduler.cancelAnimationFrame(session.runtime.animationFrameId);
    session.runtime.animationFrameId = null;
  }
  if (session.runtime.renderTimeoutId !== null) {
    session.scheduler.clearTimeout(session.runtime.renderTimeoutId);
    session.runtime.renderTimeoutId = null;
    if (session.runtime.pendingRenderResolve) {
      const resolvePendingRender = session.runtime.pendingRenderResolve;
      queueMicrotask(() => resolvePendingRender({
        cancelled: true
      }));
      session.runtime.pendingRenderResolve = null;
    }
  }

  // Remove helix listeners before stopping or disposing the simulation so
  // cancellation cannot refit a detached/cleared SVG container.
  if (session.runtime.activeContainer) {
    clearTextAnnotationState(session.runtime.activeContainer);
    clearLinearHelixConstraintState(session.runtime.activeContainer);
  }
  if (session.runtime.activeContainer?.force && typeof session.runtime.activeContainer.force.stop === 'function') {
    session.runtime.activeContainer.force.stop();
  }
  session.runtime.activeContainer?.destroy?.();
  session.runtime.activeContainer = null;
}

/**
 * Build the RNA visualisation inside `containerId` and apply all
 * vaRRI modifications.
 *
 * This is the main entry point.  Call `validate()` first to produce `v`.
 *
 * @param {string} containerId  CSS selector or element ID of the rendering container.
 * @param {Object} v  Validated parameter dictionary (from `validate()`).
 * @param {Object} [options]
 * @param {boolean} [options.forceLayout=false]  Enable force-layout animation.
 * @param {boolean} [options.forceLayoutLinearRRI=false]  Enforce a rigid two-rail RRI layout and orient the complete interaction horizontally.
 * @param {boolean} [options.forceLayoutLinearStructure=false]  Enforce the same two-rail geometry within intramolecular helices.
 * @param {boolean} [options.freeTrailingEnds=false]  Remove exterior-loop scaffolds from the force graph, leaving other loop constraints intact.
 * @param {boolean} [options.pullPseudoknotBasepairs=false]  Pull pseudoknot basepairs together and stabilize adjacent pairs with hidden diagonal springs.
 * @param {Object.<number,number>|null} [options.accessData=null]  Accessibility data map.
 * @param {{sequence1?: string, sequence2?: string}|null} [options.accessColors=null]  Optional accessibility-overlay colors.
 * @param {{sequence1RepresentsOne?: boolean, sequence2RepresentsOne?: boolean}|null} [options.accessColorMode=null]
 *     Optional per-sequence mapping flags; true means probability 1 maps to full color.
 */
export function render(session, containerId, v, options = {}) {
  cancelActiveRender(session);
  const {
    forceLayout = false,
    forceLayoutLinearRRI = false,
    forceLayoutLinearStructure = false,
    freeTrailingEnds = false,
    pullPseudoknotBasepairs = false,
    accessData = null,
    accessColors = null,
    accessColorMode = null
  } = options;

  // Bind all annotation queries to this instance's rendering root.
  session.root = session.resolveRoot(containerId);
  // Create the independent SVG/force renderer.
  const container = (session.createCanvas || createGraphCanvas)(session.root, {
    animation: forceLayout,
    labelInterval: 1
  });
  session.runtime.activeContainer = container;
  container.addRNA(v.structure, {
    structure: v.structure,
    sequence: v.sequence
  });
  if (forceLayout && freeTrailingEnds) {
    relaxForceGraphScaffold(container, v);
  }
  if (forceLayout && pullPseudoknotBasepairs) {
    applyPseudoknotLinkStrength(container, true);
  }
  if (forceLayout && (forceLayoutLinearRRI || forceLayoutLinearStructure)) {
    applyLinearHelixSprings(session, container, v, {
      rri: forceLayoutLinearRRI,
      structure: forceLayoutLinearStructure
    });
  }
  function applyModifications() {
    // Set IDs for DOM querying
    setLinksId(session);
    setLabelsId(session);

    // Strand coloring
    if (v.coloring === 'strand') {
      changeBackgroundColor(session, v);
    }

    // Tooltips and labels
    updateNodeToolTips(session, v);
    updateLinkTooltips(session, v);
    setIndexLabels(session, v);

    // Highlighting (only for 2-molecule input)
    clearGeneratedRegionHighlights(session.modelState);
    if (v.molecules === '2') {
      if (v.highlighting === 'region') highlightRegion(session, v);
      if (v.highlighting === 'basepairs') highlightBasepairs(session, v);
      if (v.backgroundhighlighting === 'region') backgroundhighlightRegion(session, v);
      if (v.backgroundhighlighting === 'basepairs') backgroundhighlightBasepairs(session, v);
    }

    // Basepair styling (colour + optional G-U dashing)
    styleBasepairs(session, v);

    // Region highlights
    applyRegionHighlights(session, v);

    // Subsequence highlights
    applySubsequenceHighlights(session, v);

    // Point mutations
    applyPointMutations(session, v);

    // Accessibility overlay
    if (accessData) {
      visualiseAccessibility(session, accessData, v.sequence1.length, accessColors, accessColorMode);
    }

    initializeTextAnnotations(session, container, v, options);

    // Linear-helix constraints may extend the initial bounds. Refit
    // after the first force ticks and annotation updates.
    if (forceLayout && (forceLayoutLinearRRI || forceLayoutLinearStructure) && typeof container.centerView === 'function') {
      container.centerView();
    }

    // When animation is on, keep the background-highlight polygon in sync
    // with the force-layout by redrawing it on every animation frame.
    if (forceLayout) {
      function highlightSyncLoop() {
        session.dom.querySelectorAll('[data-varri-region]').forEach(el => el.remove());
        session.dom.querySelectorAll('[data-varri-subseq]').forEach(el => el.remove());
        applyRegionHighlights(session, v);
        applySubsequenceHighlights(session, v);
        session.runtime.animationFrameId = session.scheduler.requestAnimationFrame(highlightSyncLoop);
      }
      session.runtime.animationFrameId = session.scheduler.requestAnimationFrame(highlightSyncLoop);
    }
  }
  return new Promise((resolve, reject) => {
    session.runtime.pendingRenderResolve = resolve;
    session.runtime.renderTimeoutId = session.scheduler.setTimeout(() => {
      session.runtime.renderTimeoutId = null;
      session.runtime.pendingRenderResolve = null;
      try {
        applyModifications();
        resolve({
          cancelled: false
        });
      } catch (err) {
        reject(err);
      }
    }, 200);
  });
}
