## Input Website

### Table of Content

- [Usage](#usage)
- [Sequence and Structure Input Fields](#sequence-and-structure-input-fields)
- [Example Input](#example-input)
- [Visualisation Settings](#visualisation-settings)
- [Region Highlights](#region-highlights)
- [Subsequence Highlights](#subsequence-highlights)
- [Probability Profiles](#probability-profiles)
- [Point Mutations](#point-mutations)
- [Text Annotations](#text-annotations)
- [Additional Features](#additional-features)
- [Export](#export)


### Usage

1. **Open `index.html`** in a modern browser (Chrome, Firefox, Edge, Safari).
2. The page loads with a pre-filled 2-molecule example automatically.
3. Fill in or modify the fields in the left panel:


### Sequence and Structure Input Fields

| Field | Description |
|---|---|
| **Sequence** | RNA sequence (IUPAC characters). Separate two molecules with `&`. |
| **Sequence names** | Names for the two strands, defaulting to `Seq. 1` and `Seq. 2`. Their colored backgrounds identify the strand; edits update its text annotation. |
| **Start index mol. 1/2** | The number assigned to the first nucleotide of each molecule. Defaults to 1. 0 is not valid; negative indices are supported. |
| **Color Choice** | Use the color pickers to customize the colors for each sequence. |
| **Structure** | Dot-bracket structure string. Separate two molecules with `&`. |

### FASTA Sequence (and Structure) Input

The **Sequence** field content can be automatically generated from **FASTA input**.
The `FASTA` button opens a dialog, in which the provided FASTA encoding is automatically parsed and split into the sequence and structure fields.
**Fasta files can also be dragged and dropped** into the dialog's FASTA input field to load.

Multiline FASTA sequence input is supported, and the trimmed subsequences are concatenated into a single sequence string. The **first whitespace-free token of each FASTA header becomes its sequence name**. Parsed names can be edited in the dialog before confirming. The structure field is left unchanged unless the FASTA input contains a **second line with a dot-bracket structure string**. If structure information is provided, each FASTA record must contain a single sequence line and a single structure line; no multi-line support in this case.

> ![IMPORTANT]
> Only if *all* FASTA records contain a structure line, the structure field is updated with the concatenated structures. Otherwise, the structure field remains unchanged.

```text
> bla
ACGAUCAUGGAUUAGAGCAUUCGACAGCAG
..<<<<...>>>>...((..(((...((..
> blub
ACGAAAAAAAGAGCAUACGACAGUAG
............))...)))..))..
```

Details about supported sequence and dot-bracket structure encodings are provided in the [Input Format Reference](sharing-and-input.md#input-format-reference) section.

### Example Input

When loading the page, a feature-overview RNA-RNA interaction is automatically rendered.
Open the **Example** dropdown to choose another RNA-RNA interaction. Each open menu item shows the example name and a short use-case description; after selection, the control shows only the chosen name.

| Control | Description |
|---|---|
| **Example dropdown** | Loads the feature overview or an existing literature example demonstrating SHAPE profiles, cropping and highlights, or mutations and sequence context. |
| **✕ Clear** | Clears all input fields, resets the visualisation, and clears the example selection. |


### Visualisation Settings

| Field | Description |
|---|---|
| **Full screen UI** | When checked, the header and footer sections are hidden, and the visualisation canvas is maximized. |
| **Nucleotide color** | `by sequence` — use the defined colors. `by loop type` — Fornac default loop-type coloring. |
| **Highlighting ..** |  |
| **.. RRI Nucleotides** | `region` — highlight all nodes in the entire intermolecular region. `basepairs` — highlight only RRI-basepair nucleotides. `nothing` — no nucleotide highlighting. |
| **Base pair color** | Chose the color used for all base pairs (intra- and intermolecular). |
| **Color Choice** | Use the color pickers to customize the highlighting colors. |
| **G-U basepairs dashed** | When checked, G-U basepairs are drawn with a dashed stroke. |
| **Force layout** | When checked, the rendered structure is shown in an interactive force-directed layout. When unchecked, the structure is drawn in a fixed layout. |
| - **Linear horizontal RRI layout** | Keeps all noncrossing intermolecular helixes on straight linear layout and rotates the complete two-molecule interaction so its RRI axis is horizontal. Enabling it also enables the force layout. |
| - **Free trailing ends** | When checked, the trailing ends of the sequences are not fixed in the force-directed layout and can move freely. |
| - **Pull Pseudoknot Basepairs** | When checked, pseudoknot basepairs are pulled together in the force-directed layout. |
| - **Linear intramolecular stem layout** | Keeps intramolecular stems (i.e. helices containing bulges or interior loops) on straight linear layout. Stems stop at multiloops or crossing pairs. Enabling it also enables the force layout. |

### Region Highlights

Add colored highlightings to paired regions of the two input sequences via the following fields and using "Add" button.
This will open a respective input dialog, which registers the highlighting on confirmation.
All registered region highlightings are shown in a list above the input fields.
User-created entries can be removed by clicking the "🗑️" icon, and selecting a listed entry will populate the input fields with its values for editing.

In addition to manually added entries, the **RRI Background** control can create an automatically generated region entry that represents the currently selected global background-highlighting mode.
These generated entries are shown in the same list but are **not removable or editable directly**, because they are derived from the current visualisation settings and updated automatically whenever the structure or highlighting mode changes.

| Field | Description |
|---|---|
| **RRI Background** | `basepairs` — translucent background behind stacked intermolecular basepairs. `region` — translucent background covering the whole intermolecular region. `nothing` — no automatically generated background region highlight. |
| **Region 1** | The start and end indices of the highlighted region in sequence 1, in the form `start-end`. |
| **Region 2** | The start and end indices of the highlighted region in sequence 2, in the form `start-end`. |
| **Color** | The color to use for the highlighted region pair. |

Behaviour of generated list entries:

- When **RRI Background** is set to `nothing`, no generated region entry is shown.
- When set to `region`, vaRRI computes the overall intermolecular interaction region and displays it as a generated, non-removable region entry.
- When set to `basepairs`, vaRRI computes one or more generated region entries that correspond to intermolecular basepair stacks and displays them as non-removable entries.
- Generated entries are refreshed automatically from the current structure and settings; they are not exported as user-defined region highlights in share links.



### Subsequence Highlights

Add colored highlightings to subsequences of the input sequences via the following fields and use the "Add" button to register them.
All registered highlightings are shown in a list above the input fields, and can be removed by clicking the "🗑️" icon.
Selecting a listed highlighting will populate the input fields with its values for editing.

| Field | Description |
|---|---|
| **Sequence** | The sequence (1 or 2) within which the subsequence is located. |
| **Range** | The start and end indices of the subsequence to highlight in the form `start-end`. |
| **Color** | The color to use for highlighting the subsequence. |

### Probability Profiles

Sometimes no homogenous coloring is desired, but rather a gradient of colors to represent the weight or importance of nucleotides w.r.t. a certain property. 
This can be achieved by providing a probability profile for each molecule, which is a list of numbers between 0 and 1 (inclusive) along with the index of the respective nucleotide.
Such probability profiles can be used to represent e.g.

- the probability of a nucleotide being unpaired, i.e. accessibility for interaction,
- phylogenetic conservation scores of a nucleotide, e.g. from multiple sequence alignments,
- measured or predicted binding probabilities of a nucleotide to a certain ligand, or
- structure probing data, e.g. SHAPE reactivities.

Note, that the probability profiles are not required to sum up to 1, but rather represent a normalized value for each nucleotide.
Furthermore, incomplete probability profiles are supported, i.e. not all nucleotides need to have a value assigned.

The probability profiles are provided in a space-separated CSV format, where each line contains the nucleotide index and the respective probability value.
As separator, either space and tab is supported, and lines starting with `#` are ignored as comments.

```csv
# positions upstream of start codon
-6 0.1
-5 0.5
# start codon
1 0.9
2 0.8
3 0.7
# positions downstream of start codon
4 0.6
23 0.2
```

> [!TIP]
> - For convenience, respective text *files can be dragged and dropped* into the input fields to load the probability profiles.
> - vaRRI also supports CSV files with a header line, where the first column contains the nucleotide indices and the second column contains the probability values. Such data is automatically converted to the space-separated format above, and the header line is ignored.

Finally, the following fields are available to define the visualization of the probability profiles:

| Field | Description |
|---|---|
| **Color** | The color to use for the probability profile. |
| **=1** | When checked, a value of 1 is mapped to the selected color, and a value of 0 is mapped to white. Otherwise, vice versa. |
| **Index wrt.** | `1st nt` — the nucleotide indices in the probability profile are interpreted as relative indices w.r.t. the first nucleotide of the molecule's sequence. `Start` — the nucleotide indices in the probability profile are absolute indices following the indexing defined by the start index of the molecule's sequence. |

> [!IMPORTANT] 
> The indices of the given probability profile are validated against the sequence and start index of the respective molecule, and a warning is shown if any indices are invalid.

### Point Mutations

RNA-RNA interaction visualizations are often used to discuss the effect of point mutations on the interaction. 
To support this, vaRRI allows to define point mutations in the input sequences and visualizes them in the rendered structure.
A point mutation is defined by the sequence (1 or 2), the index of the nucleotide to mutate, and the new nucleotide (or letter) to use for the mutation.
This information is provided in the following fields, and the "Add" button registers the mutation.

| Field | Description |
|---|---|
| **Sequence** | The sequence (1 or 2) within which the mutation is located. |
| **Position** | The index of the nucleotide to mutate. |
| **To** | The new nucleotide (or letter) to use for the mutation annotation. |
| **Color** | The color to use for highlighting the mutated nucleotide. |

> [!TIP]  
> vaRRI allows to define arbitrary letters as mutations, i.e. the mutated nucleotide does not need to be a valid IUPAC character.
> That way, any kind of annotation can be added to the sequence, e.g. a letter representing a chemical modification, symbols for a certain type of mutation, or even a short word.

All registered mutations are shown in a list above the input fields, and can be removed by clicking the "🗑️" icon.
The list shows the mutations in the standard mutation notation, e.g. `A23G` for a mutation from A to G at position 23, extracting the original nucleotide from the input sequence to avoid mistakes.
Selecting a listed mutation will populate the input fields with its values for editing.

### Text Annotations

This panel is immediately below **Visualization Settings**. Select **Add** to
open a dialog with **Text**, **Bold**, **Italic**, **Size** and **Color**.
New labels show a **?** in the list until you drag them onto the drawing. The
**⌖** symbol indicates a positioned label. Drag a label within the drawing to
move it; this works with the force layout switched off as well as on.

Select a list entry to edit it in the dialog. Cancel discards the draft.
Sequence-name entries have a fixed strand badge; editing their text also updates
the name in **Sequence & Structure Input**. Their trash buttons clear positioning
without removing the entries. User annotation trash buttons delete the entries.
Clearing all annotations removes user labels and unpositions sequence names.
Labels stay horizontal when the drawing is rotated and follow its overall
movement while the force layout runs.

The initial **Seq. 1** and **Seq. 2** labels follow their sequence endpoints until
you drag them. Positioned labels appear in SVG and PNG exports. Share links save
both positioned and unpositioned labels, including their formatting.


4. Changing selects and checkboxes rerenders immediately. Typed fields rerender when you commit the edit by leaving the field, and single-line inputs also rerender when you press Enter.


### Additional Features

- **Zooming**: Use the mouse wheel to zoom in and out.
- **Panning**: Click and drag the visualisation to pan around. This is useful when zoomed in to focus on a certain region of the structure.
- **Rotation**: Use the *Rotation* slider below the visualisation to rotate the structure. Rotation preserves text orientation and is useful to align the structure for better visibility or to match a certain orientation in a publication figure.
- **Cropping**: Use the *Crop* slider to reduce the unpaired nucleotides at the ends of each sequence to the given number. This is useful to focus on the interaction region and reduce the size of the visualisation. A value of `-1` disables cropping and shows the full sequences.
- **Nucleotide Nodes**
  - .. can be dragged to new positions in the force-directed layout mode.
  - .. show a tooltip with the nucleotide index and probability value (if present) when hovered over.
- **Resize Canvas**: The visualisation canvas size can be adjusted by dragging the bottom-right corner of the canvas. This is useful when visualizing large interactions on large screens, or when preparing figures for publication. The canvas size is preserved when exporting the visualisation.

### Export

The rendered visualisation can be exported using the buttons in the export bar below the visualisation.

**SVG graphics** are vector graphics and can be scaled to any size without loss of quality.
Thus, they are ideal for publication figures, and can be postprocessed in vector graphics editors like Inkscape or Adobe Illustrator.

**PNG graphics** are raster graphics and have a fixed resolution. They are ideal for web applications, presentations, or when a quick image is needed.
Also PNG images can be used in documents that do not support SVG graphics, e.g. Microsoft Word or PowerPoint.
Further annotations can be added to the exported PNG images in image editors like GIMP or Photoshop.

**URL/LINK** Instead of storing the image, you can also generate a URL encoding of the input for sharing or embedding in other web applications. 
The URL is copied to the clipboard when clicking the **🔗 Share Link** button.
That way, many different visualizations can be shared without the need to store the images, and the input can be easily modified by changing the URL parameters.
Details about URL encoding are given in the following section [URL Parameters & Sharing](sharing-and-input.md#url-parameters--sharing).


| Button | Description |
|---|---|
| **⬇ SVG** | Downloads a self-contained SVG file with embedded Fornac CSS. |
| **⬇ PNG** | Rasterises the SVG to a canvas (2× resolution) and downloads a PNG. |
| **🔗 Share Link** | Generate URL encoding of the input for sharing or embedding in other web applications; copied to clipboard. | 

---
