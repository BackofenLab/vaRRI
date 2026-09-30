# Free-position text annotations

Open **Text annotations**, enter the label, choose its size, color, bold or
italic style, and select **Add**. A question mark indicates that a label has
not been placed. Drag it from the list into the drawing, then drag the label
within the drawing to adjust its position. The positioned symbol in the list
updates when the label is placed.

The drawing starts with `Seq. 1` near the start of the first sequence and
`Seq. 2` near the end of the second sequence. These labels follow their sequence
ends while the force layout runs, until you move them yourself. A single-strand
figure has only the first default label.
Initial default placement prefers nearby space clear of nucleotide/index labels
and inside the current viewport. List previews use a readable minimum size while
the drawing and size field retain the chosen SVG size.

Labels remain editable, removable, and shareable. Clearing the annotations keeps
them cleared when the figure is rendered again or shared. Loading another example
starts with its own default labels. Positioned labels appear in SVG and PNG
downloads. Unpositioned labels are saved in share links but do not appear in exports.

## Coordinates and lifecycle

The core registry contains plain serializable definitions with `text`, `bold`,
`italic`, `size`, `color` and `position`. A null position means unpositioned.
Positioned values `{x, y}` are offsets from the centroid of real nucleotide nodes
in unrotated graph units. The renderer adds the current centroid when drawing and
subtracts it when converting pointer coordinates. It uses the inverse SVG screen
matrix so placement works after zoom, pan, rotation and page scrolling.

This representation follows overall force-layout translation without adding text
to the force graph or repeatedly mutating saved positions. Defaults also retain
an endpoint anchor; a user move detaches that anchor. Labels and their rounded
hit areas stay horizontal during display rotation. Their bounds do not change
the RNA rotation pivot or the existing viewport fit.

Registration and validation remain available without a DOM. The canvas owns SVG
elements and pointer handlers; Vue holds only copied definitions and form fields.
Cancelling or replacing a render removes active annotation drag and force listeners.
Each viewer has an independent registry and accepts list drops only from itself.

The JSON `textAnnotations` URL parameter is additive: existing URL keys retain
their encodings. An absent parameter permits defaults; `textAnnotations=[]`
explicitly suppresses them. Unicode text, punctuation, styles, null positions and
positioned values round-trip without delimiter escaping rules.

## Verification

Model and UI tests cover registry edits, validation, defensive copies, independent
instances, default suppression and URL restoration. Browser checks exercise list
placement and label dragging under rotation and zoom, force translation, default
endpoint tracking, export and cancellation for native and bundled core consumers.

Existing visual fixtures deliberately request `textAnnotations=[]` so they
continue checking the unchanged RNA geometry and original overlays. The text
annotation browser workflow checks the new default labels separately and saves
review screenshots in `output/playwright/ui/`.
The core browser workflow also checks and records one- through four-nucleotide
figures in `output/playwright/core-contract/text-default-*.png` to guard against
clipping or obscured indices on tightly fitted drawings.
