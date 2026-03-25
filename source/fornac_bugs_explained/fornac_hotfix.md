## Hotfix 1

if an interaction between 2 Molecules is given, fornac does not display 
the first 2 nucelotides of the second molecule.

example:

~~~
./rna_to_img.py –structure="..((..&..)).." –sequence="NNNNNN&NNNNNN" 
~~~
| forna | fixed|
| --- | --- |
|![bug1_without_fix](fornac_bug1_example_without_fix.png)|![bug1_without_fix](fornac_bug1_example_with_fix.png)|

The reason fornac removes 2 nodes if given 2 structures is it renders them invisible to create a gap between the 2 molecules.

To fix this issue, the script always adds 2 superficial nodes at the beginning of the second molecule to circumvent the problem.


## Hotfix 2

fornac uses "markers" in a default 10 interval to give an overview over the molecules. 
This marker does not account for the 2 invisible nodes. If a marker overlaps with the invisible Nodes, a useless artifact is visible.

| forna | fixed|
| --- | --- |
|![bug2_without_fix](fornac_bug2_example_without_fix.png)|![bug2_without_fix](fornac_bug2_example_with_fix.png)|

To fix this issue the script makes the marker invisible if it overlaps with the invisible Nodes.

## Hotfix 3

when one intermolecular basepair at the last position in the first sequence and in the first
position in the second sequence form, and this basepair has index labels, fornac does
not calculate the position of the index Labels  correctly.

| forna | fixed|
| --- | --- |
|[bug3_without_fix](fornac_bug3_example_without_fix.png)|[bug3_with_fix](fornac_bug3_example_with_fix.png)|

To fix this issue vaRRI adds another dummy node between the 2 sequnces, and delteting it in a post processing step