# Retained package compatibility assets

These third-party distributions preserve the published `fornac/` package paths.
The native application and standalone core do not load them. Their bytes,
licenses, and this provenance file are pinned in `scripts/vendor-manifest.js`;
all retained code assets also meet the 400-line file limit.

## Fornac

`fornac.js`, its source map, and its CSS preserve the existing Fornac v1.0.1
distribution from [ViennaRNA/fornac](https://github.com/ViennaRNA/fornac).
The exact retained files are available in the
[retained repository snapshot](https://github.com/BackofenLab/vaRRI/tree/a9a10b6ab51e061bbb19a7090d6342a63b6f86bf/fornac).
`fornac.js.map` retains the readable source contents used for the extracted
RNA algorithms. The existing [Apache 2.0 license](fornac.LICENSE.txt) is retained;
`fornac.js.LICENSE.txt` contains the same bytes at the filename advertised by the
bundle's license comment.

## D3

`d3.js` is the unmodified **D3 3.4.13 production distribution** from
[upstream commit 9364923](https://github.com/d3/d3/blob/9364923ee2b35ec2eb80ffc4bdac12a7930097fc/d3.min.js).
Its SHA-256 is
`f717263df71b14fb151931ad0a9695738fb98124a76bb723e1b9cfb9152b7a3e`.
It preserves the same engine, AMD/CommonJS support and browser `d3` global at
the historical `fornac/d3.js` URL. `package.json` keeps these legacy distributions
in a CommonJS scope for installed Node consumers.

Readable source is available from both the
[pinned upstream source](https://github.com/d3/d3/blob/9364923ee2b35ec2eb80ffc4bdac12a7930097fc/d3.js)
and the
[original repository copy](https://github.com/BackofenLab/vaRRI/blob/a9a10b6ab51e061bbb19a7090d6342a63b6f86bf/fornac/d3.js).
The upstream source SHA-256 is
`52393d8a8e15037467dd771671015ab92ead00198e361bf095ae77f7755ee7e6`;
the original copy is
`246abb6cc7bbd79ccca9a1487519368ce851f6e3e64fa44b7e5077719125d4d8`.
They differ only by the repository copy's final newline. No vaRRI-authored
module was minified to replace this upstream distribution.

The [BSD 3-Clause license](d3.LICENSE.txt) is copied exactly from that
[D3 release](https://github.com/d3/d3/blob/9364923ee2b35ec2eb80ffc4bdac12a7930097fc/LICENSE),
SHA-256 `10054db83ace18e5a455749d0d247857ec50508cecda79a5abe66fe4778d7721`.
It restores the original 2010–2014 Michael Bostock copyright and conditions;
the previous 2023 ISC text described a later D3 license, not this pinned release.
