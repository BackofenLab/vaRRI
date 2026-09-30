# vaRRI JavaScript API

`src/vaRRI.js` and `src/core/index.js` expose native ES modules. The model can
be imported without a DOM, and the canvas loads its own pinned D3 runtime when
rendered. Vue is not a core dependency.

```html
<link rel="stylesheet" href="fornac/fornac.css">
<div id="rendering-canvas" style="width: 800px; height: 600px"></div>
<script type="module">
  import vaRRI, { createVaRRI } from './src/core/index.js';
  const viewer = createVaRRI(); // independent colors, annotations, and canvas
  const input = viewer.validate({ sequence: 'ACGU', structure: '(..)' });
  await viewer.render('rendering-canvas', input);
</script>
```

Serve source files over HTTP. No compilation or Node.js environment is needed.
`createVaRRI()` creates an independent instance; the default export preserves
the historical singleton methods. Call `cancelActiveRender()` before discarding
a viewer to stop its force and pending work.

For external embedding, `npm run build` produces `dist/varri.min.js`, which
exposes `window.vaRRI` and includes D3. No separate Fornac/D3 scripts are needed.
The old `dist/vaRRI.min.js` URL remains an alias. The npm package provides native
ESM imports and `require('varri-js')` through a generated CommonJS entry.

## Core workflow

### Serializable URL state

`decodeUrlState(search)` reads the established viewer query parameters into plain
fields and annotation data. `encodeUrlState(state)` returns `URLSearchParams` for
sharing that state. Generated region annotations are excluded. Both functions
are available on the default API, as named core exports, and from the DOM-free
`varri-js/model` entry. They do not initialize a canvas or depend on Vue.

Multi-range subsequence highlights retain their ranges as one annotation when
shared and restored. Existing hex-color URL tokens are unchanged. For model
annotations with other CSS color strings, the codec uses a `css~` token followed
by the URI-encoded color value. This additive encoding preserves names and
functional colors without requiring the DOM; existing links still decode as
before. CSS color interpretation remains the renderer's responsibility.

### `vaRRI.validate(args)`

Validates and normalizes input, applies optional end cropping, and returns the
object expected by `render()`.

| Property | Type | Default | Description |
|---|---|---|---|
| `sequence` | `string` | required | IUPAC sequence; separate two molecules with `&`. |
| `structure` | `string` | required | Dot-bracket structure; separate two molecules with `&`. |
| `startIndex1` | `string\|number` | `1` | First index of molecule 1; zero is invalid. |
| `startIndex2` | `string\|number` | `1` | First index of molecule 2; zero is invalid. |
| `cropping` | `string\|number` | `-1` | Negative disables cropping; non-negative values retain that many terminal unpaired bases. |
| `labelInterval` | `string\|number` | `10` | Interval between index labels. |
| `coloring` | `string` | `strand` | `strand` or `loop`. |
| `highlighting` | `string` | `region` | `nothing`, `basepairs`, or `region`. |
| `backgroundhighlighting` | `string` | `basepairs` | `nothing`, `basepairs`, or `region`. |
| `distinctBpTypes` | `boolean` | `true` | Render G-U pairs with dashed links. |
| `subsequenceHighlights` | `Array` | `[]` | Subsequence highlight definitions. |
| `regionHighlights` | `Array` | `[]` | Region highlight definitions. |
| `pointMutations` | `Array` | `[]` | Point-mutation definitions. |
| `textAnnotations` | `Array` | instance state | Optional replacement text list; `[]` explicitly suppresses defaults. |

```javascript
const validated = vaRRI.validate({
  sequence: 'ACGU&UGCA',
  structure: '((((&))))',
  startIndex1: -2,
  startIndex2: 10,
});
```

### `vaRRI.render(containerId, validated, options?)`

Creates an independent D3 visualization, then applies labels, coloring, annotations,
profiles, and link styling. It returns a promise resolving to
`{ cancelled: boolean }`. Starting a newer render cancels pending
post-processing from the previous render.

`vaRRI.cancelActiveRender()` stops the active force simulation, removes
linear-layout listeners, and resolves any pending render as cancelled.

| Option | Type | Default | Description |
|---|---|---|---|
| `forceLayout` | `boolean` | `false` | Enable D3 force-layout animation. |
| `forceLayoutLinearStructure` | `boolean` | `false` | Apply a rigid two-rail constraint independently to intramolecular stems containing bulges or interior loops. Requires `forceLayout`. |
| `forceLayoutLinearRRI` | `boolean` | `false` | Keep a noncrossing RRI helix on two parallel rails and rotate the complete two-molecule interaction so its axis is horizontal. Requires `forceLayout`. |
| `freeTrailingEnds` | `boolean` | `false` | Relax the external-loop closure scaffold when force layout is active. |
| `pullPseudoknotBasepairs` | `boolean` | `false` | Increase pseudoknot link strength when force layout is active. |
| `accessData` | `Object<number, number>\|null` | `null` | Node-ID to probability map. |
| `accessColors` | `Object\|null` | `null` | Optional `sequence1` and `sequence2` overlay colors. |
| `accessColorMode` | `Object\|null` | `null` | Optional `sequence1RepresentsOne` and `sequence2RepresentsOne` flags. |
| `onTextAnnotationsChange` | `function` | none | Receives copied text definitions after initial placement or user dragging. |

```javascript
const state = await vaRRI.render('rendering-canvas', validated, {
  forceLayout: true,
  forceLayoutLinearStructure: true,
  forceLayoutLinearRRI: true,
  accessData: { 1: 0.8, 2: 0.3 },
});
```

### Rotation

- `vaRRI.normaliseRotationDegrees(degrees)` returns an angle in `[-180, 180]`.
- `vaRRI.rotateVisualization(containerId, degrees, options?)` rotates the
  current SVG. `options.mode` is `delta` by default or `absolute`.

Text labels are counter-rotated to remain readable.

## Colors

- `vaRRI.getColors()` returns a copy of the current color settings.
- `vaRRI.setColors(overrides)` updates only the supplied keys.

Supported keys are `sequence1`, `sequence2`, `seq1profileColor`,
`seq2profileColor`, `mutationColor`, `intermolecularHighlight`,
`backgroundHighlight`, `subsequenceHighlight`, and `basepair`.

## Annotation registries

The UI registries return clones, so mutating a returned object does not modify
library state. IDs start at `1` and reset after the corresponding `clear...()`
call.

### Subsequence highlights

A definition has `{ sequence, range, color?, alpha? }`. `sequence` is `1` or
`2`; `range` is a `"start-end"` string, a comma-separated range string, or an
array of `[start, end]` pairs.

- `vaRRI.createSubsequenceHighlight(input, sequenceContext?)`
- `vaRRI.registerSubsequenceHighlight(input, sequenceContext?)`
- `vaRRI.updateSubsequenceHighlight(id, patch, sequenceContext?)`
- `vaRRI.removeSubsequenceHighlight(id)`
- `vaRRI.clearSubsequenceHighlights()`
- `vaRRI.getSubsequenceHighlights()`

### Region highlights

A definition has
`{ sequence1Range, sequence2Range, color?, alpha?, generated? }`. Each range is
a `"start-end"` string or `[start, end]` pair.

- `vaRRI.createRegionHighlight(input, sequenceContext?)`
- `vaRRI.registerRegionHighlight(input, sequenceContext?)`
- `vaRRI.registerGeneratedRegionHighlight(validated, spec)`
- `vaRRI.updateRegionHighlight(id, patch, sequenceContext?)`
- `vaRRI.removeRegionHighlight(id)`
- `vaRRI.clearRegionHighlights()`
- `vaRRI.getRegionHighlights()`
- `vaRRI.computeBackgroundRegionRanges(validated)`
- `vaRRI.getRegionHighlightNodePath(validated, highlight)`

Generated highlights represent the automatic whole-RRI background region and
can be excluded from persisted user state.

### Point mutations

A definition has `{ sequence, position, replacement, color? }`.

- `vaRRI.normaliseMutationPosition(position, sequenceContext?)`
- `vaRRI.createPointMutation(input, sequenceContext?)`
- `vaRRI.registerPointMutation(input, sequenceContext?)`
- `vaRRI.updatePointMutation(id, patch, sequenceContext?)`
- `vaRRI.removePointMutation(id)`
- `vaRRI.clearPointMutations()`
- `vaRRI.getPointMutations()`

### Free-position text annotations

Text annotations have `{ text, bold?, italic?, size?, color?, position? }`.
`position: null` keeps an annotation in the registry without drawing it.
Font size is measured in SVG units. Text is rendered literally, including
characters such as `<` and `&`.

- `vaRRI.createTextAnnotation(input)` validates a definition without registering it.
- `vaRRI.registerTextAnnotation(input)` returns the added definition, including its ID.
- `vaRRI.updateTextAnnotation(id, patch)` changes selected properties.
- `vaRRI.removeTextAnnotation(id)` removes one annotation.
- `vaRRI.clearTextAnnotations()` clears the list and suppresses automatic defaults.
- `vaRRI.getTextAnnotations()` returns independent copies of the definitions.
- `vaRRI.refreshTextAnnotations()` redraws the annotation layer after registry edits.
- `vaRRI.placeTextAnnotation(id, clientX, clientY)` positions an annotation at
  browser client coordinates on the current canvas and refreshes the layer.

A positioned annotation stores `{ x, y }` relative to the centroid of the real
nucleotides, in unrotated graph units. Pan, zoom and display rotation do not
change these saved coordinates. The centroid moves with the force layout, so
labels follow its overall translation without participating in the simulation.
Use `placeTextAnnotation()` to convert a pointer's client coordinates correctly.

Each strand first gets `Seq. 1` near the first strand's start or
`Seq. 2` near the second strand's end when it appears in the figure. These defaults
carry a serializable terminal `anchor` and follow the endpoint through layout
changes. Dragging or explicitly updating `position` releases the anchor.
`clearTextAnnotations({ resetDefaults: true })` enables fresh defaults on the
next render, as used when loading a new example.

Pass `onTextAnnotationsChange` to `render()` to synchronize a list after pointer
placement. SVG dragging is available with animation off as well as on. Rotation
keeps the text horizontal, and both SVG and PNG exports include positioned labels.
Share links use the additive JSON `textAnnotations` query parameter; an explicit
empty array preserves a cleared list. See [text annotations](../docs/text-annotations.md).

A `sequenceContext` uses molecule keys and visible sequence metadata:

```javascript
const sequenceContext = {
  '1': { id: 'Sequence 1', offset: -2, length: 4, sequence: 'ACGU' },
  '2': { id: 'Sequence 2', offset: 10, length: 4, sequence: 'UGCA' },
};
```

## Validation and formatting helpers

| Function | Purpose |
|---|---|
| `checkStructureInputSimple(structure)` | Check bracket balance for `()`, `[]`, `{}`, and `<>`. |
| `findBasePairs(structure)` | Return zero-based matched bracket pairs. |
| `formatSequence(sequence)` | Return Canvas-ready sequence fields for one or two molecules. |
| `formatStructure(structure)` | Return Canvas-ready structure fields for one or two molecules. |
| `getIndexDictionary(validated)` | Map canvas node IDs to molecule IDs and biological positions. |
| `getMolecules(validated)` | Return `"1"` or `"2"`. |
| `getSequenceIndices(seqId, offset, length)` | Generate biological indices while skipping zero. |
| `parseSubsequences(input, startIndex?, sequenceLength?)` | Parse and optionally bounds-check range strings. |
| `splitAtAmpersand(value)` | Split once and always return two strings. |
| `validateBackgroundhighlighting(value)` | Validate a background-highlighting mode. |
| `validateCroppingInput(structure, cropping)` | Validate and normalize cropping. |
| `validateHighlighting(value)` | Validate a nucleotide-highlighting mode. |
| `validateOffset(value)` | Parse a non-zero biological index. |
| `validateSequenceInput(sequence)` | Validate IUPAC sequence input. |
| `validateStructureInput(structure, sequence)` | Validate structure syntax and sequence-length parity. |

## Base-pair utilities

- `vaRRI.getIntermolBasepairRegion(structure1, structure2)`
- `vaRRI.getLinearRriConstraintSpecs(validated)`
- `vaRRI.getLinearStructureConstraintSpecs(validated)`
- `vaRRI.listBasepairs(structureDictionary)`
- `vaRRI.listIntermolNodes(structure, shift?)`
- `vaRRI.listIntermolPairs(validated)`
- `vaRRI.listRriLoopBoundaryPairs(validated)`
- `vaRRI.listStructureLoopBoundaryPairs(validated)`
- `vaRRI.sequenceColoring(sequence1, sequence2)`

## DOM modification helpers

These advanced functions operate on the current canvas SVG. Normal consumers
should call `render()` and let it coordinate them.

| Function | Purpose |
|---|---|
| `addElement(elementType, attributes)` | Insert an SVG element in the plot. |
| `addStyleToNodes(nodeIds, style)` | Append inline style to nucleotide nodes. |
| `applyLinearHelixSprings(container, validated, options?)` | Apply requested RRI and/or intramolecular two-rail constraints to an active D3 force layout. |
| `applyPointMutations(validated)` | Apply validated mutation overlays. |
| `applyRegionHighlights(validated)` | Draw registered or validated region polygons. |
| `applySubsequenceHighlights(validated)` | Draw validated subsequence overlays. |
| `backgroundhighlightBasepairs(validated)` | Draw backgrounds around intermolecular stacks. |
| `backgroundhighlightRegion(validated)` | Draw the automatic whole-RRI background. |
| `changeBackgroundColor(validated)` | Apply strand colors. |
| `closePolygonPoints(points)` | Close a polygon point list. |
| `getPositionOfNode(nodeId)` | Read a node's `[x, y]` coordinates. |
| `highlightBasepairs(validated)` | Highlight individual intermolecular nodes. |
| `highlightRegion(validated)` | Highlight the intermolecular region. |
| `highlightSubsequence(validated, sequence, ranges, color, alpha)` | Draw a subsequence overlay. |
| `polyline(indices, style, attributes?)` | Draw an SVG polyline through node IDs. |
| `removeDummyNodes(sequence)` | Compatibility no-op; the graph contains no gap nucleotides. |
| `removeSecondLink()` | Compatibility helper; the default graph already deduplicates pairs. |
| `setAttributeForElements(targetAttr, targetValue, attr, value)` | Update matching DOM elements. |
| `setIndexLabels(validated)` | Configure biological index labels. |
| `setLabelsId()` | Assign stable IDs to index labels. |
| `setLinksId()` | Assign endpoint metadata to graph links. |
| `styleBasepairs(validated)` | Apply base-pair colors and G-U dashing. |
| `updateLinkTooltips(validated)` | Add biological positions to link tooltips. |
| `updateNodeToolTips(validated)` | Add biological positions to node tooltips. |
| `visualiseAccessibility(data, sequence1Length, colors?, colorMode?)` | Draw probability overlays. |

## Export

- `vaRRI.buildSVGString(containerId)` returns a self-contained SVG string with
  computed presentation styles and explicit dimensions.
- `vaRRI.downloadSVG(containerId, filename = 'vaRRI_output.svg')` downloads the
  self-contained SVG.
- `vaRRI.downloadPNG(containerId, filename = 'vaRRI_output.png', scale = 2)`
  rasterizes the same SVG onto a white canvas and downloads a PNG.

All three functions throw if the container does not contain an SVG.
