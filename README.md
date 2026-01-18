# vaRRI
For any working inter- and intramolecular structure and sequence of one or two molecules, create a visualsation using the fornac tool

2 distinctly colored molecules and their intermolecular region highlighted:

![example.svg](test/verified/test13.svg)
~~~
./rna_to_img.py -u=".<<<....>>>.(((.<<<<<....>>>>>.(((..<<..>>..&..<<....>>..)))...)))." -e="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNN" -c=distinct -o=example.svg
~~~
// explain more

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

# examples
creates a visualisation of an intramolecular structure:
~~~
./rna_to_img.py -u="((...))...." -e="NNNNNNNNNNN" > example.svg
~~~

creates a visualisation of an intra- and intermolecular structure:
~~~
./rna_to_img.py -u="((...))..<<..&...>>.." -e="NNNNNNNNNNNNN&NNNNNNN" > example.svg
~~~
creates a visualisation of a crossing intermolecular structure:
~~~
./rna_to_img.py -u="((..<<..))....&...>>.." -e="NNNNNNNNNNNNNN&NNNNNNN" > example.svg
~~~

// more examples

# Features

// explain all features and give examples

[-u STRUCTURE] 
[-e SEQUENCE] 
[-o OUTPUT] 
[-c COLORING] 
[-i HIGHLIGHTING] 
[-o1 OFFSET1]
[-o2 OFFSET2] 
[-l LOGGING]


# sturcuters
very simple example of a pseudoknot intermolecular structure:
~~~
./rna_to_img.py -u="<<<..((..>>>&<<<..))..>>>" -e="NNNNNNNNN
NNN&NNNNNNNNNNNN" -c=distinct -o=test3.svg -v
~~~
complex example of pseudoknot intermolecular structure (2 kissing hairpins)
~~~
./rna_to_img.py -u="<<<..(((..>>>...<<<..(((..>>>..&<<<..)))..>>>...<<<..)))..>>>.." -e="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN" -c=distinct -o=test3.svg 
~~~
