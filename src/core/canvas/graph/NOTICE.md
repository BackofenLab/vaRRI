# RNA layout provenance

The graph stylesheet, polygon coordinate, planarization, secondary-structure classification,
label positioning, and force scaffold algorithms derive from **Fornac v1.0.1**,
[ViennaRNA/fornac](https://github.com/ViennaRNA/fornac), distributed under the
[Apache License 2.0](LICENSE.txt), © 2014 Peter Kerpedjiev.
The [original distribution](https://github.com/BackofenLab/vaRRI/tree/84862d1/fornac)
contains the upstream stylesheet and JavaScript source map. The map includes
`simplernaplot.js`, `rnautils.js`, `rnagraph.js`, and `fornac.js`. The
maximum-matching implementation credits Ronny Lorenz in that source.
`structure.css` retains the node, link, label, and arrow rules used by vaRRI.

`coordinates.js` preserves the original algorithm. Other modules adapt the
algorithms to ES modules and explicit data arguments. Changes include contiguous
real nucleotide IDs, explicit strand breaks, unique base-pair links, scoped DOM
ownership, deterministic IDs, safe degenerate label vectors, and explicit
exterior-loop scaffold metadata. Two invisible vertices per strand break and the loop/stem
hubs participate in layout. Only real nucleotides receive biological indices.
D3 is imported through the separately licensed pinned vendor module.
