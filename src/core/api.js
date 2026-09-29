import { decodeUrlState, encodeUrlState } from './model/url-state.js';
import { setColors, getColors, sequenceColoring } from './model/colors.js';
import { createSubsequenceHighlight, registerSubsequenceHighlight, updateSubsequenceHighlight, removeSubsequenceHighlight, clearSubsequenceHighlights, getSubsequenceHighlights } from './model/subsequences.js';
import { createRegionHighlight, registerRegionHighlight, updateRegionHighlight, removeRegionHighlight, clearRegionHighlights, getRegionHighlights, registerGeneratedRegionHighlight } from './model/regions.js';
import { normaliseMutationPosition, createPointMutation, registerPointMutation, updatePointMutation, removePointMutation, clearPointMutations, getPointMutations } from './model/mutations.js';
import { splitAtAmpersand, checkStructureInputSimple, findBasePairs, listIntermolNodes } from './model/brackets.js';
import { validateSequenceInput, validateCroppingInput, validateStructureInput, validateOffset, validateHighlighting, validateBackgroundhighlighting, parseSubsequences } from './model/input.js';
import { formatStructure, formatSequence, getMolecules, getSequenceIndices, getIndexDictionary } from './model/indexing.js';
import { validate } from './model/validate.js';
import { computeBackgroundRegionRanges, getRegionHighlightNodePath, getIntermolBasepairRegion } from './model/region-paths.js';
import { listBasepairs, listIntermolPairs } from './model/pairs.js';
import { listRriLoopBoundaryPairs, listStructureLoopBoundaryPairs, getLinearRriConstraintSpecs, getLinearStructureConstraintSpecs } from './model/loops.js';
import { setAttributeForElements, setLinksId, setLabelsId, addStyleToNodes, getPositionOfNode, addElement } from './canvas/dom.js';
import { updateNodeToolTips, setIndexLabels, updateLinkTooltips } from './canvas/labels.js';
import { closePolygonPoints, polyline } from './canvas/shapes.js';
import { changeBackgroundColor, highlightRegion, highlightBasepairs, removeSecondLink, removeDummyNodes, applyPointMutations, styleBasepairs } from './canvas/styling.js';
import { highlightSubsequence, applyRegionHighlights, applySubsequenceHighlights, backgroundhighlightBasepairs, backgroundhighlightRegion } from './canvas/overlays.js';
import { visualiseAccessibility } from './canvas/accessibility.js';
import { applyLinearHelixSprings } from './canvas/layout/linear-helix.js';
import { cancelActiveRender, render } from './canvas/render.js';
import { normaliseRotationDegrees, rotateVisualization } from './canvas/rotation.js';
import { buildSVGString, downloadSVG, downloadPNG } from './canvas/export.js';
import { createSession } from './session.js';

/** Create an independent visualization API with its own colors, annotations and render lifecycle. */
export function createVaRRI(options = {}) {
  const session = createSession(options);
  return {
    createVaRRI,
    decodeUrlState,
    encodeUrlState,
    cancelActiveRender: cancelActiveRender.bind(null, session),
    normaliseRotationDegrees: normaliseRotationDegrees,
    render: render.bind(null, session),
    rotateVisualization: rotateVisualization.bind(null, session),
    validate: args => validate(args, session.colors),
    getColors: getColors.bind(null, session),
    setColors: setColors.bind(null, session),
    clearPointMutations: clearPointMutations.bind(null, session),
    clearRegionHighlights: clearRegionHighlights.bind(null, session),
    clearSubsequenceHighlights: clearSubsequenceHighlights.bind(null, session),
    computeBackgroundRegionRanges: computeBackgroundRegionRanges,
    createPointMutation: (input, context) => createPointMutation(input, context, session.colors),
    createRegionHighlight: (input, context) => createRegionHighlight(input, context, session.colors),
    createSubsequenceHighlight: (input, context) => createSubsequenceHighlight(input, context, session.colors),
    getPointMutations: getPointMutations.bind(null, session),
    getRegionHighlightNodePath: getRegionHighlightNodePath,
    getRegionHighlights: getRegionHighlights.bind(null, session),
    getSubsequenceHighlights: getSubsequenceHighlights.bind(null, session),
    registerGeneratedRegionHighlight: registerGeneratedRegionHighlight.bind(null, session),
    registerPointMutation: registerPointMutation.bind(null, session),
    registerRegionHighlight: registerRegionHighlight.bind(null, session),
    registerSubsequenceHighlight: registerSubsequenceHighlight.bind(null, session),
    removePointMutation: removePointMutation.bind(null, session),
    removeRegionHighlight: removeRegionHighlight.bind(null, session),
    removeSubsequenceHighlight: removeSubsequenceHighlight.bind(null, session),
    updatePointMutation: updatePointMutation.bind(null, session),
    updateRegionHighlight: updateRegionHighlight.bind(null, session),
    updateSubsequenceHighlight: updateSubsequenceHighlight.bind(null, session),
    checkStructureInputSimple: checkStructureInputSimple,
    findBasePairs: findBasePairs,
    formatSequence: formatSequence,
    formatStructure: formatStructure,
    getIndexDictionary: getIndexDictionary,
    getMolecules: getMolecules,
    getSequenceIndices: getSequenceIndices,
    parseSubsequences: parseSubsequences,
    splitAtAmpersand: splitAtAmpersand,
    validateBackgroundhighlighting: validateBackgroundhighlighting,
    validateCroppingInput: validateCroppingInput,
    validateHighlighting: validateHighlighting,
    validateOffset: validateOffset,
    normaliseMutationPosition: normaliseMutationPosition,
    validateSequenceInput: validateSequenceInput,
    validateStructureInput: validateStructureInput,
    getIntermolBasepairRegion: getIntermolBasepairRegion,
    getLinearRriConstraintSpecs: getLinearRriConstraintSpecs,
    getLinearStructureConstraintSpecs: getLinearStructureConstraintSpecs,
    listBasepairs: listBasepairs,
    listIntermolNodes: listIntermolNodes,
    listIntermolPairs: listIntermolPairs,
    listRriLoopBoundaryPairs: listRriLoopBoundaryPairs,
    listStructureLoopBoundaryPairs: listStructureLoopBoundaryPairs,
    sequenceColoring: sequenceColoring.bind(null, session),
    addElement: addElement.bind(null, session),
    addStyleToNodes: addStyleToNodes.bind(null, session),
    applyLinearHelixSprings: applyLinearHelixSprings.bind(null, session),
    applyPointMutations: applyPointMutations.bind(null, session),
    applyRegionHighlights: applyRegionHighlights.bind(null, session),
    applySubsequenceHighlights: applySubsequenceHighlights.bind(null, session),
    backgroundhighlightBasepairs: backgroundhighlightBasepairs.bind(null, session),
    backgroundhighlightRegion: backgroundhighlightRegion.bind(null, session),
    changeBackgroundColor: changeBackgroundColor.bind(null, session),
    closePolygonPoints: closePolygonPoints,
    getPositionOfNode: getPositionOfNode.bind(null, session),
    highlightBasepairs: highlightBasepairs.bind(null, session),
    highlightRegion: highlightRegion.bind(null, session),
    highlightSubsequence: highlightSubsequence.bind(null, session),
    polyline: polyline.bind(null, session),
    removeDummyNodes: removeDummyNodes,
    removeSecondLink: removeSecondLink.bind(null, session),
    setAttributeForElements: setAttributeForElements.bind(null, session),
    setIndexLabels: setIndexLabels.bind(null, session),
    setLabelsId: setLabelsId.bind(null, session),
    setLinksId: setLinksId.bind(null, session),
    styleBasepairs: styleBasepairs.bind(null, session),
    updateLinkTooltips: updateLinkTooltips.bind(null, session),
    updateNodeToolTips: updateNodeToolTips.bind(null, session),
    visualiseAccessibility: visualiseAccessibility.bind(null, session),
    buildSVGString: buildSVGString.bind(null, session),
    downloadPNG: downloadPNG.bind(null, session),
    downloadSVG: downloadSVG.bind(null, session),
  };
}
