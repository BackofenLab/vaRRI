rm test_output -r
mkdir test_output
python3.10 rna_to_svg.py "..........&.........." "AAAAABBBBB&AAAAABBBBB" -o test_output/test1.svg --offset_1 5 --offset_2 -15
python3.10 rna_to_svg.py "..((((...))))...((...((...((..&............))...))...)).." "ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o test_output/test2.svg --offset_1 -100 --offset_2 -100 
python3.10 rna_to_svg.py "..((((...))))...((...((...((..&............))...))...)).." "ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o test_output/test3.svg --offset_1 -100 --offset_2 100
python3.10 rna_to_svg.py "..((((...))))...((...((...((..&............))...))...)).." "ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o test_output/test4.svg --offset_1 100 --offset_2 -100
python3.10 rna_to_svg.py "..((((...))))...((...((...((..&............))...))...)).." "ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o test_output/test5.svg --offset_1 100 --offset_2 100 
python3.10 rna_to_svg.py "..((((...))))...((...((...((..&............))...))...)).." "ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o test_output/test6.png --offset_1 -100 --offset_2 -100
python3.10 rna_to_svg.py "..((((...))))................." "ACGAUCAGAGAUCAGAGCAUACGACAGCAG" -o test_output/test7.svg --offset_1 -100 --offset_2 -100
