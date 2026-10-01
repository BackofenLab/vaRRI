## URL Parameters & Sharing

**vaRRI** supports state persistence directly via URL parameters, allowing you to pre-fill inputs or share specific visualization configurations using the **🔗 Share Link** button in the export panel. Most parameter names map directly to their corresponding HTML element IDs.

### Key Parameters

In the following, the most important URL parameters are listed with their expected values. 
See the [viewer guide](viewer-guide.md) and the [Input Format Reference](#input-format-reference) section for details on valid input values.

| Parameter | Description |
| --- | --- |
| **`sequence`** | IUPAC nucleotide sequence. Use `&` as a separator for two interacting molecules (*e.g., `GCAUGGCGGGCAA&CCCGCAU*`). |
| **`structure`** | Secondary structure in dot-bracket notation. Separate two molecules with `&` (*e.g., `((...))..<<..&...>>..*`). |
| **`startIndex1` / `startIndex2`** | Starting sequence indices for strand 1 and strand 2 (default: `1`). |
| **`colorSeq1` / `colorSeq2`** | Custom color hex codes for sequence strands 1 and 2 (*e.g., `%23ff0000` for `#ff0000*`). |
| **`coloring`** | Nucleotide color scheme (`strand` or `loop`). |
| **`highlighting` / `backgroundhighlighting`** | RRI highlight targets (`region`, `basepairs`, or `nothing`). |
| **`colorRriNodes` / `colorRriRegion` / `colorBasepair`** | Hex color codes for nucleotide highlights, background highlights, and base pairs. |
| **`distinctBpTypes`** | Toggle display of G-U Wobble base pairs as dashed lines (`true` / `false`). |
| **`forceLayout`** | Enable or disable the force-layout physics simulation (`true` / `false`). |
| **`forceLayoutLinearRRI`** | Enforce a linear horizontal layout of all noncrossing RRI helices. Enabling it also enables `forceLayout`. |
| **`forceLayoutLinearStructure`** | Enforce a linear layout of intramolecular stems containing bulges or interior loops. Enabling it also enables `forceLayout`. |

To simplify sequence and structure input validation, sequence and structure inputs are highlighted with the chosen strand-specific colors.

While editing either input, the character immediately left of the cursor is
highlighted in amber in both fields. If that position contains a paired bracket
in the structure, its partner is highlighted in teal in both fields as well.
This works for all four bracket types, including pairs across `&`. Positions
missing from a shorter input and unmatched brackets are skipped. Selecting text
or leaving the input clears these temporary highlights.

> [!IMPORTANT]
> - All URL parameters are case-sensitive. 
> - Use proper URL encoding for special characters (e.g., `&` as `%26`, parentheses as `%28` and `%29`) when encoding yourself.


---

## 🔗 Embedding / Web Integration

You can embed the visualization directly into external web pages (e.g., in documentation, blogs, or web tools) using an `<iframe>`.

### Embeddings in Existing Web Applications

Currently, vaRRI is already available as an RRI visualizer in the the following web applications:

- Freiburg RNA Tools: [https://rna.informatik.uni-freiburg.de/](https://rna.informatik.uni-freiburg.de/)
  - IntaRNA - RNA-RNA interaction prediction server
    - [Example visualization](https://rna.informatik.uni-freiburg.de/IntaRNA/Result.jsp?toolName=IntaRNA&jobID=4267751)
  - CopomuS - Compensatory Mutation Designer for RNA-RNA interactions
    - [Example visualization](https://rna.informatik.uni-freiburg.de/CopomuS/Result.jsp?toolName=CopomuS&jobID=1595284)
- Galaxy Visualizer: [https://usegalaxy.eu/](https://usegalaxy.eu/)
  - vaRRI is available as a visualization tool for RNA-RNA interactions in the Galaxy workflow system
    - [Example Galaxy history](https://usegalaxy.eu/u/videmp/h/varri-galaxy-visualization) visualizing RRIs from different tools


### Query Parameter

Use the `showRenderingOnly=true` URL parameter to hide all surrounding UI elements (header, controls panel, footer) and display only the visualization result panel.

```text
https://backofenlab.github.io/vaRRI/index.html?showRenderingOnly=true&<remaining_parameters...>
```

For embedding without header and footer, you can also use the `hideFooterAndHeader=true` parameter, which will hide the header and footer but keep the controls panel visible, i.e. this checks the "Full screen UI" checkbox in the controls panel.

### HTML Example

```html
<iframe 
  src="https://backofenlab.github.io/vaRRI/?sequence=ACGAUCAUGGAUUAGAGCAUUCGACAGCAG%26ACGAAAAAAAGAGCAUACGACAGUAG&colorSeq1=%23add8e6&startIndex1=-6&colorSeq2=%23f4bb44&startIndex2=100&structure=..%3C%3C%3C%3C...%3E%3E%3E%3E...%28%28..%28%28%28...%28%28..%26............%29%29...%29%29%29..%29%29..&coloring=strand&highlighting=region&colorRriNodes=%23ff0000&backgroundhighlighting=basepairs&colorRriRegion=%23ff0000&colorBasepair=%23ff0000&distinctBpTypes=on&forceLayout=on&profileColor1=%23800080&profileColorRepresentsOne1=on&profileColor2=%23ff0000&profileData1=%23+unpaired+probabilities%0A1+0.9%0A2+0.7%0A3+0.3%0A4+0.1%0A7+0.3%0A8+0.7%0A9+0.6&profileIdxRef1=1&profileIdxRef2=1&cropping=2&mutations=1%3A16G%3A338a29%2C2%3A118C%3A338a29&highlights=1%3A18-20%3A338a29%2C2%3A114-116%3A338a29&showRenderingOnly=true" 
  width="100%" 
  height="600" 
  style="border: none;"
  title="vaRRI Visualization">
</iframe>
```

> [!IMPORTANT] 
> Ensure special characters in URL parameters (such as `&` separating two RNA strands) are properly URL-encoded as `%26` when constructing embedding links manually. Also `()` have to be encoded using `%28` and `%29` respectively, as they are not encoded by default by URL encoders following RFC 3986.

Valid embedding links can be generated using the "🔗 Share Link" button in the vaRRI interface but have to extended with `&showRenderingOnly=true`.

----

<iframe 
  src="https://backofenlab.github.io/vaRRI/?showRenderingOnly=true&sequence=ACGAUCAUGGAUUAGAGCAUUCGACAGCAG%26ACGAAAAAAAGAGCAUACGACAGUAG&colorSeq1=%23add8e6&startIndex1=-6&colorSeq2=%23f4bb44&startIndex2=100&structure=..%3C%3C%3C%3C...%3E%3E%3E%3E...%28%28..%28%28%28...%28%28..%26............%29%29...%29%29%29..%29%29..&coloring=strand&highlighting=region&colorRriNodes=%23ff0000&backgroundhighlighting=basepairs&colorRriRegion=%23ff0000&colorBasepair=%23ff0000&distinctBpTypes=on&forceLayout=on&profileColor1=%23800080&profileColorRepresentsOne1=on&profileColor2=%23ff0000&profileData1=%23+unpaired+probabilities%0A1+0.9%0A2+0.7%0A3+0.3%0A4+0.1%0A7+0.3%0A8+0.7%0A9+0.6&profileIdxRef1=1&profileIdxRef2=1&cropping=2&mutations=1%3A16G%3A338a29%2C2%3A118C%3A338a29&highlights=1%3A18-20%3A338a29%2C2%3A114-116%3A338a29" 
  width="100%" 
  height="600" 
  style="border: 2px solid #333333; border-radius: 6px;"
  title="vaRRI Visualization">
</iframe>

----

> [!NOTE] 
> GitHub repository preview strips embedded `<iframe>` elements as above for security reasons. 
> * If you are viewing [this page on **GitHub Pages**](https://backofenlab.github.io/vaRRI/README.html), the live widget will render directly below.


## Input Format Reference

### Table of Contents

- [Dot-Bracket Notation](#dot-bracket-notation)
- [Two-Molecule Input](#two-molecule-input)
- [IUPAC Sequence Characters](#iupac-sequence-characters)
- [Start Index](#start-index)


### Dot-Bracket Notation

vaRRI accepts standard dot-bracket secondary structure notation with the following characters:

| Character | Meaning |
|---|---|
| `.` | Unpaired nucleotide |
| `(` `)` | Basepair (parentheses) |
| `[` `]` | Basepair (square brackets) |
| `{` `}` | Basepair (curly brackets) |
| `<` `>` | Basepair (angled brackets) |
| `&` | Separator between two molecules |

You can use any of the four bracket types to represent basepairs, and they can be nested arbitrarily.  
The only restriction is that the brackets must be balanced, i.e. every opening bracket must have a corresponding closing bracket of the same type.

> [!IMPORTANT] 
> vaRRI retains the polygon layout algorithm extracted from Fornac. This initial layout uses non-crossing basepairs, so pseudoknots need additional handling.
> In that case, the primary layout will be based on a reduced set of basepairs that do not cross each other, and the remaining basepairs are added subsequently.
> Therefore, the layout of pseudoknotted structures may not be optimal, and the visualisation may be less clear than for non-pseudoknotted structures.

### Two-Molecule Input

To encode an RNA-RNA interaction, structures and sequences of both RNA molecules are separated by the `&` character.  

The character positions before `&` belong to molecule 1; positions after `&`
belong to molecule 2.  Intermolecular basepairs are identified automatically
as unmatched brackets: an opening bracket in molecule 1 that has no partner in
molecule 1 is paired to a closing bracket in molecule 2 (and vice-versa).

For example, the following input encodes an RRI where the first molecule has an intra-molecular hairpin in front of the interaction region.:

```
Structure:  ..((((...))))...((...((...((..&............))...))...))..
Sequence:   ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG
```

Alternatively, the structure encoding can also be done using different bracket types to distinguish (for the user) between intra- and intermolecular basepairs.:

```
Structure:  ..((((...))))...[[...[[...[[..&............]]...]]...]]..
```

But as discussed, the layout algorithm does not distinguish between different bracket types, and the visualisation will be the same.


### IUPAC Sequence Characters

Accepted characters (case-insensitive):

| Character(s) | Meaning |
|---|---|
| `A` `C` `G` `U` `T` | Standard nucleotides |
| `R` | A or G |
| `Y` | C or T/U |
| `S` | G or C |
| `W` | A or T/U |
| `K` | G or T/U |
| `M` | A or C |
| `B` | C, G or T/U |
| `D` | A, G or T/U |
| `H` | A, C or T/U |
| `V` | A, C or G |
| `N` | Any nucleotide |

> [!TIP] 
> Using *upper- and lower-case letters* is supported and can be used to encode and annote certain regions of the sequence, e.g. to distinguish between coding and non-coding regions, or to highlight certain motifs.


### Start Index

Molecule positions are displayed using a 1-based index by default.  You can
change the start index to any integer except 0.  Negative start indices are
supported (e.g. when counting upstream of a start codon).  The start index is used for all
position-based annotations, including highlightings, point mutations, and probability profiles.

---
