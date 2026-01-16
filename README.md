# vaRRI
For any working inter- and intramolecular structure and sequence of one or two molecules, create a visualsation using the fornac tool
// explain more

# Installation
install playwright 
~~~
pip install playwright
~~~
install chromium browser
~~~
playwright install chromium
~~~

# examples
creates a visualisation of an intra- and intermolecular structure:
~~~
python3.10 rna_to_svg.py -u="((..))..<<..&...>>.." -e="AAAAAAAAAAAA&AAAAAAA"
~~~
creates a visualisation of a crossing intermolecular structure:
~~~
python3.10 rna_to_svg.py -u="((..<<..))..&...>>.." -e="AAAAAAAAAAAA&AAAAAAA"
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
