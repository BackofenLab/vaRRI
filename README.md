# vaRRI
This Tool creates a visualization for any working inter- and intramolecular structure and sequence involving one or two molecules, using FornaC.

Example interaction between the molecule MicF and IpxR, displayed in the paper(link), generated using vaRRI
![example.svg](test/verified/test36_animated.svg)
~~~
./rna_to_img.py -o=example.svg --startIndex1=67 --sequence="GCCAGUAGCCUUGCUAUUUCAGUGGCGAAUGAUGAUGCAGGU&GCUAUCAUCAUUAACUUUAUUUAU" --structure="...(((((............(((....(((((((((((....&)).))))))))).))))))))..." --accessibility1="RNAplfold" --accessibility2="RNAplfold"
~~~
# Overview

- [vaRRI](#varri)
- [Overview](#overview)
- [Installation](#installation)
- [Features](#features)
  - [Mandatory Parameters](#mandatory-parameters)
  - [Optional Parameters](#optional-parameters)
  - [Usage Examples](#usage-examples)




# Installation

We need to install

- playwright (tested and developed with v1.57.0)
- chromium browser (install via playwright)

```sh
# install dependencies
python3 -m pip install playwright==1.57.0
python3 -m playwright install chromium
# check version
python3 -m playwright --version
```

# Features

## Mandatory Parameters

<details>
<summary><b><code>--structure</code></b> Specifies the RNA secondary structure in dot-bracket notation.</summary>


| Notation | Meaning |
|----------|---------|
| `(` `)` | Base pair |
| `[` `]` | Alternative bracket pair  |
| `<` `>` | Alternative bracket pair  |
| `{` `}` | Alternative bracket pair  |
| `.` | Unpaired nucleotide |
| `&` | Separator between two molecules (intermolecular interaction) |


<table style="width:100%">
  <tr>
    <td> 
    <b> intramolecular:</b>
    <br/><br/>

```sh
rna_to_img.py \
  -u="((...))...." \
  -e="NNNNNNNNNNN"
```

</td>
    <td>
        <a href="test/verified/test1.svg">
            <img src="test/verified/test1.svg" width="200">
        </a>
    </td>
  </tr>
  <tr>
    <td style="border:none;">
    <b>intermolecular:</b> 
    <br/><br/>

```sh
rna_to_img.py \
  -u="((...))..<<..&...>>.." \
  -e="NNNNNNNNNNNNN&NNNNNNN"
```

</td>
    <td style="border:none;">
        <a href="test/verified/test1.svg">
            <img src="test/verified/test2.svg" width="200">
        </a>    
    </td>
  </tr>
</table>
<details>
<summary><b>Hybrid Input Format (Advanced)</b></summary>

The hybrid input format provides a convenient way to specify intermolecular base pairing interactions using position indices instead of dot-bracket notation.

**Format:**
```
<start_pos_1><pipes_and_dots>&<start_pos_2><pipes_and_dots>
```

Where:
- `<start_pos>`: Starting position (index, can be negative, can not be 0)
- `|`: Represents a base pair in the intermolecular interaction
- `.`: Represents an unpaired position within the interaction region

**How it works:**
- Both molecules must have the **same number** of `|` characters (representing the same number of base pairs)
- Interaction positions are defined relative to your sequence start Index
- The tool automatically converts hybrid input to standard dot-bracket notation

<table style="width:100%">
  <tr>
    <td> 
    <b> Example (simple interaction):</b><br/>
    Two sequences with interaction starting at position 5 (seq1) and position 3 (seq2) and each has 3 intermolecular base pairs
    <br/><br/>

```sh
./rna_to_img.py \
  -u="5|||..&3|||.." \
  -e="NNNNNNNNNNNNN&NNNNNNN"
```

<br/>
    </td>
    <td>
        <a href="test/verified/test13.svg">
            <img src="test/verified/test13.svg" width="200">
        </a>
    </td>
  </tr>
  <tr>
    <td> 
    <b>Example (with custom start Index)</b><br/>
    Start indexing from position 10 (seq1) and 100 (seq2) <br/>
    Interaction starts at position 15 (seq1) and 102 (seq2)
    <br/><br/>

```sh
rna_to_img.py \
  -u="15|||..&102|||.." \
  -e="NNNNNNNNNNNNN&NNNNNNN" \
  -i1=10 \
  -i2=100
```

<br/>
    </td>
    <td>
        <a href="test/verified/test14.svg">
            <img src="test/verified/test14.svg" width="200">
        </a>
    </td>
  </tr>
  <tr>
    <td> 
    <b>Example (negative positions):</b><br/>
    start indexing form -10 (seq1) and 1 (seq2) <br/>
    Interaction starts at position -5 (seq1) and 3 (seq2)
    <br/><br/>

```sh
rna_to_img.py \
  -u="-5|||..&3|||.." \
  -e="NNNNNNNNNNNNN&NNNNNNN" \
  -i1=-10 \
  -i2=1
```

<br/>
    </td>
    <td>
        <a href="test/verified/test15.svg">
            <img src="test/verified/test15.svg" width="200">
        </a>
    </td>
  </tr>
</table>
<br/>

**Hybrid vs. Dot-Bracket Comparison:**
These two commands are equivalent:
<table style="width:100%">
  <tr>
    <td> 
    <b>Hybrid format:</b>
    <br/><br/>

```sh
rna_to_img.py \
  -u="5|||..&3|||" \
  -e="NNNNNNNNNNNNNN&NNNNN"
```

</td>
    <td>
        <a href="test/verified/test13.svg">
            <img src="test/verified/test13.svg" width="200">
        </a>
    </td>
  </tr>
  <tr>
    <td style="border:none;">
    <b>Equivalent dot-bracket format:</b> 
    <br/><br/>

```sh
rna_to_img.py \
  -u="....(((......&..))).." \
  -e="NNNNNNNNNNNNN&NNNNNNN"
```

</td>
    <td style="border:none;">
        <a href="test/verified/test32.svg">
            <img src="test/verified/test32.svg" width="200">
        </a>    
    </td>
  </tr>
</table>
</details>
<br/> 
</details>
<details>
<summary><b><code>--sequence</code></b> Specifies the RNA sequence using IUPAC nucleotide codes
</summary>

| Code | Nucleotide | Code | Nucleotide |
|------|-----------|------|-----------|
| `A` | Adenosine | `N` | Any nucleotide |
| `C` | Cytidine | `W` | Adenosine or Uridine |
| `G` | Guanosine | `S` | Cytidine or Guanosine |
| `U` | Uridine | `K` | Guanosine or Uridine |
| | | `&` | Separator between two molecules |

<table style="width:100%">
  <tr>
    <td> 
    <b>Example:</b>
    <br/><br/>

```sh
rna_to_img.py -u=".((...))." -e="AACGAGUGA"
```

</td>
    <td>
        <a href="test/verified/test5.svg">
            <img src="test/verified/test5.svg" width="200">
        </a>
    </td>
  </tr>
</table>
</details>

## Optional Parameters
<details>
<summary><code><b>-o</code>/ <code>--output</code></b> Specifies the output file name and format
</summary>


| Value | Description |
|-------|-------------|
| `STDOUT` (default) | Print SVG to standard output |
| `filename` | Save as SVG with given name |
| `filename.png` | Save as PNG with given name |

Examples:
```bash
# Output to stdout
rna_to_img.py -u="((...))." -e="ACGAGUGA" > output.svg

# Save as SVG file
rna_to_img.py -u="((...))." -e="ACGAGUGA" -o=structure

# Save as PNG file
rna_to_img.py -u="((...))." -e="ACGAGUGA" -o=structure.png
```
</details>

<details>
<summary><code><b>-c</code>/ <code>--coloring</code></b> Defines how nucleotides should be colored
</summary>


| Option | Description | Example |
|--------|-------------|---------|
| `loop`  | Standard fornac coloring scheme |  <a href="test/verified/test27.svg"><img src="test/verified/test27.svg" width="150">   </a> |
| `strand` (default) | Each molecule receives its own color | <a href="test/verified/test28.svg"><img src="test/verified/test28.svg" width="150">  |

<table style="width:100%">
  <tr>
    <td> 
    <b>Example:</b>
    <br/><br/>
    
```sh
rna_to_img.py \
  -u="((...))..<<..&...>>.." \
  -e="NNNNNNNNNNNNN&NNNNNNN" \
  -c=strand
```

</td>
    <td>
        <a href="test/verified/test3.svg">
            <img src="test/verified/test3.svg" width="200">
        </a>
    </td>
  </tr>
</table>



</details>

<details>
<summary><code><b>-H</code>/ <code>--highlighting</code></b> Specifies the highlighting mode for intermolecular structures </summary>


<table style="width:100%">
  <tr>
    <td> 
    <b>Option</b>
    </td>
    <td>
    <b>Example Image</b>
    </td>
  </tr>
  <tr>
    <td> 
    <code>nothing</code>: no sepcial highlighting
    <br/><br/>

```sh
rna_to_img.py \
  -u="((...))..<<....<<..&..>>...>>.." \
  -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" \
  -H=nothing \
  -c=loop
```

<br/>
    </td>
    <td>
        <a href="test/verified/test27.svg">
            <img src="test/verified/test27.svg" width="200">
        </a>
    </td>
  </tr>
    <tr>
    <td> 
    <code>basepairs</code>: Highlights only individual intermolecular base pairs
    <br/><br/>

```sh
rna_to_img.py \
  -u="((...))..<<....<<..&..>>...>>.." \
  -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" \
  -H=basepairs
```

<br/>
    </td>
    <td>
        <a href="test/verified/test23.svg">
            <img src="test/verified/test23.svg" width="200">
        </a>
    </td>
  </tr>
    <tr>
    <td> 
    <code>region</code>(default): Highlights entire intermolecular interaction region
    <br/><br/>

```sh
rna_to_img.py \
  -u="((...))..<<....<<..&..>>...>>.." \
  -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" \
  -H=region
```

<br/>
    </td>
    <td>
        <a href="test/verified/test26.svg">
            <img src="test/verified/test26.svg" width="200">
        </a>
    </td>
  </tr>
</table>


</details>
<details>
<summary><code><b>-bH</code>/ <code>--backgroundhighlighting</code></b> Specifies the background highlighting mode for intermolecular interactions </summary>

| Option | Description |
|--------|------------|
| `nothing` | no background highlighting |
| `basepairs` (default) | highlights intermolecular basepair stacking |
| `region` | highlights the full intermolecular interaction region |


```sh
rna_to_img.py \
  --structure="((...))..<<..&...>>.." \
  --sequence="NNNNNNNNNNNNN&NNNNNNN" \
  -bH=region
```
</details>

<details>
<summary><code><b>-i1</code>/ <code>--startIndex1</code>, <code>-i2</code>/ <code>--startIndex2</code></b> Sets the starting index for each molecule </summary>

| Parameter | Constraint |
|-----------|-----------|
| Default | `1` |
| Restriction | Cannot be `0` |

<table style="width:100%">
  <tr>
    <td> 
      <b>Example:</b> Indexing starts with 10
    <br/><br/>

```sh
rna_to_img.py \
  -u="..((...))." \
  -e="AAACGAGUGA" \
  -i1=10
```

</td>
    <td>
        <a href="test/verified/test11.svg">
            <img src="test/verified/test11.svg" width="200">
        </a>
    </td>
  </tr>
  <tr>
    <td> 
      <b>Example:</b> Both molecules have different start indicies
    <br/><br/>

    
```sh
rna_to_img.py \
  -u="((...))..<<..&...>>.." \
  -e="NNNNNNNNNNNNN&NNNNNNN" \
  -i1=5 \
  -i2=100
```

</td>
    <td>
        <a href="test/verified/test12.svg">
            <img src="test/verified/test12.svg" width="200">
        </a>
    </td>
  </tr>
</table>
</details>
<details>
<summary><code><b>-v</code>/ <code>--verbose</code></b>
 Enables detailed logging output for debugging and troubleshooting </summary>

```bash
./rna_to_img.py -u="((...))." -e="ACGAGUGA" -v
```
</details>
<details>
<summary><code><b>-l</code>/ <code>--labelInterval</code></b> Defines how often labels with indices are displayed </summary>

| Option | Description |
|-----------|-------------|
| n | Shows index labels every *n* nucleotides  |
| `10` | default |

```sh
rna_to_img.py \
  -u="((...))....((...))" \
  -e="ACGAGUGAACGAGUGA" \
  -l=5
```
</details>

<details>
<summary><code><b>--crop</code>, <code>--crop1</code>, <code>--crop2</code></b> Crops sequences around the intermolecular interaction region </summary>


| Parameter | Description                        |
| --------- | ---------------------------------- |
| `--crop`  | Applies cropping to both molecules |
| `--crop1` | Crops only the first molecule      |
| `--crop2` | Crops only the second molecule     |

```sh
rna_to_img.py \
  -u="((...))..<<..&...>>.." \
  -e="NNNNNNNNNNNNN&NNNNNNN" \
  --crop=5
```

</details>


<details>
<summary><code><b>--highlightSubseq1</code>,  <code>--highlightSubseq2</code></b> Highlights specific subsequences </summary>

| Parameter            | Description                    |
| -------------------- | ------------------------------ |
| `--highlightSubseq1` | Subsequences in first molecule  |
| `--highlightSubseq2` | Subsequences in second molecule |

```sh
rna_to_img.py \
  -u="((...))..<<..&...>>.." \
  -e="NNNNNNNNNNNNN&NNNNNNN" \
  --highlightSubseq1="1:2,5:10"
```

</details>


<details>
<summary><code><b>--guBasepairs</code></b> Controls visualization of G-U base pairs </summary>

| Option            | Description                         |
| ----------------- | ----------------------------------- |
| Enabled (default) | G-U basepairs shown as dashed lines |
| Disabled          | No special visualization            |

```sh
rna_to_img.py \
  -u="((...))" \
  -e="GUGUGUGU" \
  --guBasepairs
```

</details>


<details>
<summary><code><b>--fastafile</code></b> Load one or two sequences from a FASTA file </summary>


```sh
rna_to_img.py \
  --fastafile=example.fasta \
  -u="((...))"
```

</details>


<details>
<summary><code><b>--predictStructure1</code>, <code>--predictStructure2</code></b> Enable intramolecular structure prediction </summary>

| Parameter             | Description                           |
| --------------------- | ------------------------------------- |
| `--predictStructure1` | Predict intramolecular structure for first molecule. Constraints: `--structure` Basepairs  |
| `--predictStructure2` | Predict intramolecular structure for second molecule. Constraints: `--structure` Basepairs  |

```sh
rna_to_img.py \
  -e="ACGAGUGA" \
  --predictStructure1
```

</details>

<details>
<summary><code><b>--animation</code></b> Activates fornac’s force-directed layout animation
</summary>

```sh
rna_to_img.py \
  -u="((...))" \
  -e="ACGAGUGA" \
  --animation
```

</details>

<details>
<summary><code><b>--accessibility1</code>, <code>--accessibility2</code></b> Visualize nucleotide accessibility </summary>


| Option           | Description                           |
| ---------------- | ------------------------------------- |
| `None` (default) | No visualization                      |
| `RNAplfold`      | Predict accessibility using RNAplfold |
| `path/to/file`   | Use precomputed lunp file             |

```sh
rna_to_img.py \
  -u="((...))" \
  -e="ACGAGUGA" \
  --accessibility1="RNAplfold"
```

</details>

<details>
<summary><code><b>--RNAfold</code></b> Pass custom parameters to RNAfold </summary>

```sh
rna_to_img.py \
  -e="ACGAGUGA" \
  --predictStructure1 \
  --RNAfold="-T20"
```

</details>

<details>
<summary><code><b>--RNAplfold</code></b> Pass custom parameters to RNAplfold </summary>


```sh
rna_to_img.py \
  -e="ACGAGUGA" \
  --accessibility1="RNAplfold" \
  --RNAplfold="-T20"
```

</details>



## Usage Examples

<table style="width:100%">
  <tr>
    <td> 
    <b>Simple Intramolecular Structure</b><br/>
    Visualization of a single RNA molecule with one hairpin loop:
    <br/><br/>

```sh
rna_to_img.py -u=".((...))." -e="AACGAGUGA" > hairpin.svg
```


<br/>
    </td>
    <td>
        <a href="test/verified/test5.svg">
            <img src="test/verified/test5.svg" width="200">
        </a>
    </td>
  </tr>
  <tr>
    <td> 
    <b>Intermolecular Interaction with Distinct Coloring</b><br/>
Two molecules interacting where each molecule has its own color:
    <br/><br/>

```sh
rna_to_img.py \
  -u="((...))..<<..&...>>.." \
  -e="NNNNNNNNNNNNN&NNNNNNN" \
  -c=strand \
  -o=interaction.svg
```

<br/>
    </td>
    <td>
        <a href="test/verified/test3.svg">
            <img src="test/verified/test3.svg" width="200">
        </a>
    </td>
  </tr>
    <tr>
    <td> 
    <b>Custom Indexing</b><br/>
Start numbering from different positions for each molecule:
    <br/><br/>

```sh
rna_to_img.py \
  -u="((...))..<<..&...>>.." \
  -e="NNNNNNNNNNNNN&NNNNNNN" \
  -i1=5 -i2=100 \
  -o=custom_index.svg
```

<br/>
    </td>
    <td>
        <a href="test/verified/test12.svg">
            <img src="test/verified/test12.svg" width="200">
        </a>
    </td>
  </tr>

  <tr>
    <td> 
    <b>Pseudoknot Structure (Simple)</b><br/>
A basic pseudoknot involving two interacting molecules:
    <br/><br/>

```sh
rna_to_img.py \
  -u="<<<..((..>>>&<<<..))..>>>" \
  -e="NNNNNNNNNNN&NNNNNNNNNNNN" \
  -c=strand \
  -o=pseudoknot_simple.svg
```

<br/>
    </td>
    <td>
        <a href="test/verified/test29.svg">
            <img src="test/verified/test29.svg" width="2000">
        </a>
    </td>
  </tr>
  <tr>
    <td> 
    <b>Pseudoknot Structure (Complex - Kissing Hairpins)</b><br/>
Two molecules forming a complex kissing hairpin interaction:
    <br/><br/>

```sh
rna_to_img.py \
  -u="<<<..(((..>>>...<<<..(((..>>>..&<<<..)))..>>>...<<<..)))..>>>.." \
  -e="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN" \ 
  -c=strand \ 
  -o=kissing_hairpins.svg
```

<br/>
    </td>
    <td>
        <a href="test/verified/test30.svg">
            <img src="test/verified/test30.svg" width="2000">
        </a>
    </td>
  </tr>
</table>


