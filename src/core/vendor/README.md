# Pinned D3 runtime

`d3.js` contains the repository's D3 **3.4.13** engine, with its BSD license
preserved in `D3-LICENSE.txt`. The original source remains in `fornac/d3.js`
(SHA-256 `246abb6cc7bbd79ccca9a1487519368ce851f6e3e64fa44b7e5077719125d4d8`).

The only runtime adaptation is to wrap initialization in `getD3(document)`.
It returns a cached runtime for that document without writing globals. Importing
the core in a DOM-free environment therefore does not initialize D3. The checked-in
vendor asset is already minified; using the viewer never generates or compiles it.

Owned canvas modules remain ordinary, readable native ES modules. The vendor's
format is not a way to evade the 400-line limit on application modules.
