# RNA layout provenance

The polygon coordinate, planarization, secondary-structure classification,
label positioning, and force scaffold algorithms derive from **Fornac v1.0.1**,
[ViennaRNA/fornac](https://github.com/ViennaRNA/fornac), distributed under the
Apache License 2.0 reproduced in `LICENSE.txt`. Their pinned source is preserved
in the repository's `fornac/fornac.js.map` (`simplernaplot.js`, `rnautils.js`,
`rnagraph.js`, and `fornac.js`). The maximum-matching implementation credits
Ronny Lorenz in that source.

`coordinates.js` preserves the original algorithm. Other modules adapt the
algorithms to ES modules and explicit data arguments. Changes include contiguous
real nucleotide IDs, explicit strand breaks, unique base-pair links, scoped DOM
ownership, deterministic IDs, safe degenerate label vectors, and explicit
exterior-loop scaffold metadata. No fake nucleotide or synthetic strand-gap
nodes are created. Invisible geometric loop/stem hubs remain intentional force
constraints. D3 is imported through the separately licensed pinned vendor module.
