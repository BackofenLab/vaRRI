#!/usr/bin/python3
import hashlib
import logging
import os
import subprocess
from pathlib import Path

current_dir = Path(__file__).parent
logging.basicConfig(level=logging.INFO,
                        format="[{levelname}] {message}",
                        style="{")

def hashfile(filepath):
    try:
        with open(filepath, "r") as f:
            file_content = f.read()
        hash = hashlib.sha256(file_content.encode()).hexdigest()
        return hash
    except FileNotFoundError:
        logging.error(f"{filepath} was not found")

inputs = [ 
    # basic test [start 0, tests 6] 
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST ',
    'SCRIPT --structure="((...))...." --sequence="NNNNNNNNNNN" -o=TEST ',
    'SCRIPT --structure="((...))..<<..&...>>.." --sequence="NNNNNNNNNNNNN&NNNNNNN" -o=TEST ',
    'SCRIPT --structure="((...))..<<..&...>>.." --sequence="NNNNNNNNNNNNN&NNNNNNN" -o=TEST ',
    'SCRIPT --structure="....(((.....&..)))" --sequence="NNNNNNNNNNNN&NNNNN" -o=TEST ',
    'SCRIPT --structure=".((...))." --sequence="AACGAGUGA" -o=TEST ',
    # startIndex images [start 6, tests 7]
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST --startIndex1=666 --startIndex2=666 ',
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST --startIndex1=-666 --startIndex2=666 ',
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAUGAGCAUACGACAGCAG" -o=TEST --startIndex1=-666 --startIndex2=-666 ',
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST --startIndex1=666 --startIndex2=-666 ',
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAUGAGCAUACGACAGCAG" -o=TEST --startIndex1=-666 --startIndex2=-666 ',
    'SCRIPT --structure="..((...))." --sequence="AAACGAGUGA" -i1=10 -o=TEST ',
    'SCRIPT --structure="((...))..<<..&...>>.." --sequence="NNNNNNNNNNNNN&NNNNNNN" -i1=5 -i2=100 -o=TEST ',
    # hybrid input images [start 13, tests 6]
    'SCRIPT --structure="5|||..&3|||.." --sequence="NNNNNNNNNNNNN&NNNNNNN" -o=TEST ',
    'SCRIPT --structure="15|||..&102|||.." --sequence="NNNNNNNNNNNNN&NNNNNNN" -i1=10 -i2=100 -o=TEST ',
    'SCRIPT --structure="-5|||..&3|||.." --sequence="NNNNNNNNNNNNN&NNNNNNN" -i1=-10 -i2=1 -o=TEST ',
    'SCRIPT --structure="1|||&5|||" --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST ',
    'SCRIPT --structure="100|||&205|||" --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST  -i1=99 -i2=200 -H=basepairs',
    'SCRIPT --structure="..((((...))))...((...((..(((...))).((.....&...))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAA&AGAGCAUACGACAGCAG" -o=TEST  -i1=-2 -i2=2000 -H=basepairs',
    # single molecule images [start 19, tests 2]
    'SCRIPT --structure="..((((...))))...((...((..(((...))).((.....))))))" --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAAAAAAAA" -o=TEST  -i1=-2 -i2=2000 -H=basepairs',
    'SCRIPT --structure="..((((...))))...((...((..(((...))).((.....))))))" --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAAAAAAAA" -o=TEST  -i1=-2 -i2=2000 -H=region',
    # highlighting of intermolecular basepairs - images [start 21, tests 3]
    'SCRIPT --structure="(((((...)))..))&..(((((...)))))" --sequence="GGGCGAAACGCCAAA&AACCCGAAACGGGAA" -o=TEST  -i1=-2 -i2=-2 -H=basepairs',
    'SCRIPT --structure="....(((..(((&))..)))..)" --sequence="AUAUGCGAAUUG&CGCAAUUCGA" -o=TEST  -i1=-2 -i2=-2 -H=basepairs',
    'SCRIPT --structure="((...))..<<....<<..&..>>...>>.." --sequence="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -H=basepairs -o=TEST ',
    # highlighting of intermolecular region - images [start 24, tests 3]
    'SCRIPT --structure=".<<<<<<....>>>>>>.(((.<<...>>.(((..<<....>>..<<<<<....>>>((...))>>&..<<....>>..)))...)))." --sequence="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNN"  -o=TEST',
    'SCRIPT --structure=".<<<<<<....>>>>>>.(((.<<...>>.(((..<<....>>..<<<<<....>>>((...))>>&..<<....>>..)))...)))." --sequence="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNN"  -H=basepairs -o=TEST',
    'SCRIPT --structure="((...))..<<....<<..&..>>...>>.." --sequence="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -H=region -o=TEST ',
    # no higlighting - images [start 27, tests 2]
    'SCRIPT --structure="((...))..<<....<<..&..>>...>>.." --sequence="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -H=nothing -o=TEST -c=loop',
    'SCRIPT --structure="((...))..<<....<<..&..>>...>>.." --sequence="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -H=nothing  -o=TEST',
    # pseudoknot test [start 29, tests 2]
    'SCRIPT --structure="<<<..((..>>>&<<<..))..>>>" --sequence="NNNNNNNNNNNN&NNNNNNNNNNNN"  -H=basepairs -o=TEST',
    'SCRIPT --structure="<<<..(((..>>>...<<<..(((..>>>..&<<<..)))..>>>...<<<..)))..>>>.." --sequence="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN"  -o=TEST',
    # complex showcase test [start 31, tests 1]
    'SCRIPT --structure=".<<<....>>>.(((.<<<<<....>>>>>.(((..<<..>>..&..<<....>>..)))...)))." --sequence="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNN"  -o=TEST',
    'SCRIPT --structure="....(((......&..))).." --sequence="NNNNNNNNNNNNN&NNNNNNN" -o=TEST ',
    'SCRIPT -o=TEST -H=region --startIndex1=-10 --startIndex2=200 --predictStructure1 --structure="..((((...))))...((...((..(((...))).((.....))))))" --accessibility1="RNAplfold" --accessibility2="RNAplfold" --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAAAAAAAA" --RNAplfold="-T20"',
    'SCRIPT -o=TEST -H=region --startIndex1=-10 --startIndex2=200 --predictStructure1 --structure="5..||||...&209...||||...." --accessibility1="RNAplfold" --accessibility2="RNAplfold" --fastafile=test/example.fasta --RNAplfold="-T20" --highlightSubseq2=215:222 --predictStructure2',
    'SCRIPT -o=TEST -H=region --startIndex1=-10 --startIndex2=200 --predictStructure1 --structure="5..||||...&209...||||...." --accessibility1="RNAplfold" --accessibility2="RNAplfold" --fastafile=test/example.fasta --RNAplfold="-T20" --highlightSubseq2=210:222 --predictStructure2 --crop=5',
    'SCRIPT -o=TEST --startIndex1=67 --sequence="GCCAGUAGCCUUGCUAUUUCAGUGGCGAAUGAUGAUGCAGGU&GCUAUCAUCAUUAACUUUAUUUAU" --structure="...(((((............(((....(((((((((((....&)).))))))))).))))))))..." --accessibility1="RNAplfold" --accessibility2="RNAplfold"'
    ]


for index, command in enumerate(inputs):
    test_name = f"test{index}.svg"
    test_path = str(current_dir) + "/images/" + test_name
    script_path = str(current_dir) + "/../source/rna_to_img.py"
    logging.info(f"Running {test_name}...")
    command = command.replace("TEST", test_path)
    command = command.replace("SCRIPT", script_path)
    subprocess.run(command, shell=True)
    test = hashfile(str(current_dir) + f"/images/{test_name}")
    verified = hashfile(str(current_dir) + f"/verified/{test_name}")
    if test and verified and test == verified:
        logging.info(f"{test_name} passed!")
        # remove test file if test passed
        os.remove(test_path)
    else:
        logging.error(f"{test_name} failed!")
   

