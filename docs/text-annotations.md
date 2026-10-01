# Free-position text annotations

Open **Text annotations**, immediately below **Visualization Settings**, and
select **Add** to open the text dialog. Enter the label, choose its size, color,
bold or italic style, and confirm. Select a list entry to edit it in the same
dialog; cancelling leaves the saved annotation unchanged. A question mark indicates that a label has
not been placed. Drag it from the list into the drawing, then drag the label
within the drawing to adjust its position. The positioned symbol in the list
updates when the label is placed.

The **Sequence & Structure Input** panel contains a name field for each strand,
with a background matching that strand's color. Names default to `Seq. 1` and
`Seq. 2`. The drawing places the first name near the first sequence's start and
the second name near the second sequence's end. These labels follow their sequence
ends while the force layout runs, until you move them yourself. A single-strand
figure has only the first default label.
Initial default placement prefers nearby space clear of nucleotide/index labels
and inside the current viewport. List previews use a readable minimum size while
the drawing and size field retain the chosen SVG size.

Sequence-name entries have a fixed strand badge to distinguish them from user
annotations. Editing either the name field or its text annotation updates both.
The trash button clears a sequence-name label's position and keeps its list entry;
drag the entry back onto the drawing to place it again. User labels are deleted
normally. Clearing all annotations removes user labels and unpositions sequence
names. Those positions stay cleared when the figure is rendered again or shared.
Loading another example
starts with its own default labels. Positioned labels appear in SVG and PNG
downloads. Unpositioned labels are saved in share links but do not appear in exports.

## Coordinates and lifecycle

The model stores `seqName1` and `seqName2`; the registry contains plain definitions
with `text`, `bold`, `italic`, `size`, `color` and `position`. Sequence-name labels
also carry `sequenceNameFor: '1' | '2'`, independent of their placement or anchor.
A null position means unpositioned.
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
suppresses automatic positioning while keeping the sequence-name entries.
Optional `seqName1` and `seqName2` URL parameters set the names and take precedence
over names in annotation records. Older links using `seq1name` or `seq2name` still
load; newly shared links use `seqName1` and `seqName2`. Unicode text, punctuation, styles, null positions and
positioned values round-trip without delimiter escaping rules.

FASTA import takes the first whitespace-delimited token after each `>` as the
sequence name. The dialog displays these parsed names and lets you edit them
before applying the import. Cancelling discards the drafts. Header descriptions
remain separate from names; editing a draft name is preserved when confirming.

The existing combined sequence/structure strings and biological-index mapping
remain unchanged. Two name fields and explicit label identity provide the needed
synchronization without introducing another copy of the full sequence data.

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
