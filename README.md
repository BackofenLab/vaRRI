# vaRRI
This Tool creates a visualization for any working inter- and intramolecular structure and sequence involving one or two molecules, using FornaC.

Example for two distinctly colored molecules, with their intermolecular region highlighted:

![example.svg](test/verified/test31.svg)
~~~
./rna_to_img.py -u=".<<<....>>>.(((.<<<<<....>>>>>.(((..<<..>>..&..<<....>>..)))...)))." -e="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNN" -c=distinct -o=example.svg
~~~

# Installation
install playwright 
~~~
python3 -m pip install playwright==1.57.0
~~~
install chromium browser
~~~
python3 -m playwright install chromium
~~~
make sure that the playwright version is 1.57.0
~~~
python3 -m playwright --version
~~~

# Features

## Mandatory Parameters
### `-u` / `--structure`
Specifies the RNA secondary structure in dot-bracket notation.

| Notation | Meaning |
|----------|---------|
| `(` `)` | Base pair |
| `[` `]` | Alternative bracket pair (pseudoknot region 1) |
| `<` `>` | Alternative bracket pair (pseudoknot region 2) |
| `{` `}` | Alternative bracket pair (pseudoknot region 3) |
| `.` | Unpaired nucleotide |
| `&` | Separator between two molecules (intermolecular interaction) |


<table style="width:100%">
  <tr>
    <td> 
    <b> intramolecular:</b>
    <br/><br/>
    <code>./rna_to_img.py -u="((...))...." -e="NNNNNNNNNNN"</code>
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
    <code>./rna_to_img.py -u="((...))..<<..&...>>.." -e="NNNNNNNNNNNNN&NNNNNNN"</code>
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
- Interaction positions are defined relative to your sequence offset
- The tool automatically converts hybrid input to standard dot-bracket notation

<table style="width:100%">
  <tr>
    <td> 
    <b> Example (simple interaction):</b><br/>
    Two sequences with interaction starting at position 5 (seq1) and position 3 (seq2) and each has 3 intermolecular base pairs
    <br/><br/>

<pre><code>./rna_to_img.py -u="5|||..&3|||.." -e="NNNNNNNNNNNNN&NNNNNNN"</code></pre>
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
    <b>Example (with custom offsets)</b>
    <br/><br/>
<pre><code># Start numbering from position 10 (seq1) and 100 (seq2)
# Interaction starts at position 15 (seq1) and 102 (seq2)
./rna_to_img.py -u="15|||..&102|||.." -e="NNNNNNNNNNNNN&NNNNNNN" -o1=10 -o2=100
</code></pre>
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
    <b>negative positions</b>
    <br/><br/>

<pre><code># Interaction can start before the sequence offset
./rna_to_img.py -u="-5|||..&3|||.." -e="NNNNNNNNNNNNN&NNNNNNN" -o1=-10 -o2=1
</code></pre>
<br/>
    </td>
    <td>
        <a href="test/verified/test15.svg">
            <img src="test/verified/test15.svg" width="200">
        </a>
    </td>
  </tr>
</table>

**Hybrid vs. Dot-Bracket Comparison:**
These two commands are equivalent:
<table style="width:100%">
  <tr>
    <td> 
    <b>Hybrid format:</b>
    <br/><br/>
    <code>./rna_to_img.py -u="5|||..&3|||" -e="NNNNNNNNNNNNNN&NNNNN"</code>
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
    <code>./rna_to_img.py -u="....(((.....&..)))" -e="NNNNNNNNNNNN&NNNNN"</code>
    </td>
    <td style="border:none;">
        <a href="test/verified/test4.svg">
            <img src="test/verified/test4.svg" width="200">
        </a>    
    </td>
  </tr>
</table>

</details>


### `-e` / `--sequence`
Specifies the RNA sequence using IUPAC nucleotide codes.

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
    <code>./rna_to_img.py -u="((...))." -e="ACGAGUGA"</code>
    </td>
    <td>
        <a href="test/verified/test5.svg">
            <img src="test/verified/test5.svg" width="200">
        </a>
    </td>
  </tr>
</table>

---
## Optional Parameters
<details>
<summary><code><b>-o</code>/ <code>--output</code></b></summary>
Specifies the output file name and format.

| Value | Description |
|-------|-------------|
| `STDOUT` (default) | Print SVG to standard output |
| `filename` | Save as SVG with given name |
| `filename.png` | Save as PNG with given name |

Examples:
```bash
# Output to stdout
./rna_to_img.py -u="((...))." -e="ACGAGUGA" > output.svg

# Save as SVG file
./rna_to_img.py -u="((...))." -e="ACGAGUGA" -o=structure

# Save as PNG file
./rna_to_img.py -u="((...))." -e="ACGAGUGA" -o=structure.png
```
</details>

<details>
<summary><code><b>-c</code>/ <code>--coloring</code></b></summary>
Defines how nucleotides should be colored.

| Option | Description | Example |
|--------|-------------|---------|
| `default` (default) | Standard fornac coloring scheme |  <a href="test/verified/test27.svg"><img src="test/verified/test27.svg" width="150">   </a> |
| `distinct` | Each molecule receives its own color | <a href="test/verified/test28.svg"><img src="test/verified/test28.svg" width="150">  |

<table style="width:100%">
  <tr>
    <td> 
    <b>Example:</b>
    <br/><br/>
    <code>./rna_to_img.py -u="((...))..<<..&...>>.." -e="NNNNNNNNNNNNN&NNNNNNN" -c=distinct</code>
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
<summary><code><b>-i</code>/ <code>--highlighting</code></b></summary>
Specifies which elements should be highlighted in intermolecular structures (only applies to 2-molecule systems).

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

<pre>
./rna_to_img.py -u="((...))..<<....<<..&..>>...>>.." -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -i=nothing
</pre>
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
<pre>
./rna_to_img.py -u="((...))..<<....<<..&..>>...>>.." -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -i=basepairs
</pre>
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
<pre>
./rna_to_img.py -u="((...))..<<....<<..&..>>...>>.." -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -i=region
</pre>
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
<summary><code><b>-o1</code>/ <code>--offset1</code></b></summary>
Sets the starting index for the first molecule's nucleotide numbering.

| Parameter | Constraint |
|-----------|-----------|
| Default | `1` |
| Restriction | Cannot be `0` |

<table style="width:100%">
  <tr>
    <td> 
    <b>Example (start numbering at 10):</b>
    <br/><br/>
    <code>./rna_to_img.py -u="((...))." -e="ACGAGUGA" -o1=10</code>
    </td>
    <td>
        <a href="test/verified/test11.svg">
            <img src="test/verified/test11.svg" width="200">
        </a>
    </td>
  </tr>
</table>

</details>
<details>
<summary><code><b>-o2</code>/ <code>--offset2</code></b></summary>
Sets the starting index for the second molecule's nucleotide numbering (only relevant for intermolecular structures).

| Parameter | Constraint |
|-----------|-----------|
| Default | `1` |
| Restriction | Cannot be `0` |

<table style="width:100%">
  <tr>
    <td> 
    <b>Example:</b>
    <br/><br/>
    <code>./rna_to_img.py -u="((...))..<<..&...>>.." -e="NNNNNNNNNNNNN&NNNNNNN" -o1=5 -o2=100</code>
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
<summary><code><b>-v</code>/ <code>--verbose</code></b></summary>
Enables detailed logging output for debugging and troubleshooting.

```bash
./rna_to_img.py -u="((...))." -e="ACGAGUGA" -v
```
</details>

---

## Usage Examples

<table style="width:100%">
  <tr>
    <td> 
    <b>Simple Intramolecular Structure</b><br/>
    Visualization of a single RNA molecule with one hairpin loop:
    <br/><br/>
<code>./rna_to_img.py -u="((...))." -e="ACGAGUGA" > hairpin.svg</code>
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
Two molecules interacting with distinct colors:
    <br/><br/>
<code>./rna_to_img.py -u="((...))..<<..&...>>.." -e="NNNNNNNNNNNNN&NNNNNNN" -c=distinct -o=interaction.svg</code>

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
<code>./rna_to_img.py -u="((...))..<<..&...>>.." -e="NNNNNNNNNNNNN&NNNNNNN" -o1=5 -o2=100 -o=custom_index.svg</code>
<br/>
    </td>
    <td>
        <a href="test/verified/test12.svg">
            <img src="test/verified/test12.svg" width="200">
        </a>
    </td>
  </tr>
</table>


## Advanced Examples

<table style="width:100%">
  <tr>
    <td> 
    <b>Pseudoknot Structure (Simple)</b><br/>
A basic pseudoknot involving two interacting molecules:
    <br/><br/>

<code>./rna_to_img.py -u="<<<..((..>>>&<<<..))..>>>" -e="NNNNNNNNNNN&NNNNNNNNNNNN" -c=distinct -o=pseudoknot_simple.svg</code>

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

<code>./rna_to_img.py -u="<<<..(((..>>>...<<<..(((..>>>..&<<<..)))..>>>...<<<..)))..>>>.." -e="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN" -c=distinct -o=kissing_hairpins.svg</code>

<br/>
    </td>
    <td>
        <a href="test/verified/test30.svg">
            <img src="test/verified/test30.svg" width="2000">
        </a>
    </td>
  </tr>
</table>

