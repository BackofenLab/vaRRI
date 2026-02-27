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
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST',
    'SCRIPT -u="((...))...." -e="NNNNNNNNNNN" -o=TEST',
    'SCRIPT -u="((...))..<<..&...>>.." -e="NNNNNNNNNNNNN&NNNNNNN" -o=TEST',
    'SCRIPT -u="((...))..<<..&...>>.." -e="NNNNNNNNNNNNN&NNNNNNN" -o=TEST -c=distinct',
    'SCRIPT -u="....(((.....&..)))" -e="NNNNNNNNNNNN&NNNNN" -o=TEST',
    'SCRIPT -u="((...))." -e="ACGAGUGA" -o=TEST',
    # offset images [start 6, tests 7]
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST --offset1=666 --offset2=666',
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST --offset1=-666 --offset2=666 -c=distinct',
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAUGAGCAUACGACAGCAG" -o=TEST --offset1=-666 --offset2=-666 -c=distinct',
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST --offset1=666 --offset2=-666 -c=distinct',
    'SCRIPT --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAUGAGCAUACGACAGCAG" -o=TEST --offset1=-666 --offset2=-666 -c=distinct',
    'SCRIPT -u="((...))." -e="ACGAGUGA" -o1=10 -o=TEST',
    'SCRIPT -u="((...))..<<..&...>>.." -e="NNNNNNNNNNNNN&NNNNNNN" -o1=5 -o2=100 -o=TEST',
    # hybrid input images [start 13, tests 6]
    'SCRIPT -u="5|||..&3|||.." -e="NNNNNNNNNNNNN&NNNNNNN" -o=TEST',
    'SCRIPT -u="15|||..&102|||.." -e="NNNNNNNNNNNNN&NNNNNNN" -o1=10 -o2=100 -o=TEST',
    'SCRIPT -u="-5|||..&3|||.." -e="NNNNNNNNNNNNN&NNNNNNN" -o1=-10 -o2=1 -o=TEST',
    'SCRIPT -u="1|||&5|||" --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST -c=distinct',
    'SCRIPT -u="100|||&205|||" --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=TEST -c=distinct -o1=99 -o2=200 -i=basepairs',
    'SCRIPT --structure="..((((...))))...((...((..(((...))).((.....&...))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAA&AGAGCAUACGACAGCAG" -o=TEST -c=distinct -o1=-2 -o2=2000 -i=basepairs',
    # single molecule images [start 19, tests 2]
    'SCRIPT --structure="..((((...))))...((...((..(((...))).((.....))))))" --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAAAAAAAA" -o=TEST -c=distinct -o1=-2 -o2=2000 -i=basepairs',
    'SCRIPT --structure="..((((...))))...((...((..(((...))).((.....))))))" --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAAAAAAAA" -o=TEST -c=distinct -o1=-2 -o2=2000 -i=region',
    # highlighting of intermolecular basepairs - images [start 21, tests 3]
    'SCRIPT --structure="(((((...)))..))&..(((((...)))))" --sequence="GGGCGAAACGCCAAA&AACCCGAAACGGGAA" -o=TEST -c=default -o1=-2 -o2=-2 -i=basepairs',
    'SCRIPT --structure="....(((..(((&))..)))..)" --sequence="AUAUGCGAAUUG&CGCAAUUCGA" -o=TEST -c=default -o1=-2 -o2=-2 -i=basepairs',
    'SCRIPT -u="((...))..<<....<<..&..>>...>>.." -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -i=basepairs -o=TEST',
    # highlighting of intermolecular region - images [start 24, tests 3]
    'SCRIPT -u=".<<<<<<....>>>>>>.(((.<<...>>.(((..<<....>>..<<<<<....>>>((...))>>&..<<....>>..)))...)))." -e="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNN" -c=distinct -o=TEST',
    'SCRIPT -u=".<<<<<<....>>>>>>.(((.<<...>>.(((..<<....>>..<<<<<....>>>((...))>>&..<<....>>..)))...)))." -e="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNN" -c=distinct -i=basepairs -o=TEST',
    'SCRIPT -u="((...))..<<....<<..&..>>...>>.." -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -i=region -o=TEST',
    # no higlighting - images [start 27, tests 2]
    'SCRIPT -u="((...))..<<....<<..&..>>...>>.." -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -i=nothing -o=TEST',
    'SCRIPT -u="((...))..<<....<<..&..>>...>>.." -e="NNNNNNNNNNNNNNNNNNN&NNNNNNNNNNN" -i=nothing -c=distinct -o=TEST',
    # pseudoknot test [start 29, tests 2]
    'SCRIPT -u="<<<..((..>>>&<<<..))..>>>" -e="NNNNNNNNNNNN&NNNNNNNNNNNN" -c=distinct -i=basepairs -o=TEST',
    'SCRIPT -u="<<<..(((..>>>...<<<..(((..>>>..&<<<..)))..>>>...<<<..)))..>>>.." -e="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN" -c=distinct -o=TEST',
    # complex showcase test [start 31, tests 1]
    'SCRIPT -u=".<<<....>>>.(((.<<<<<....>>>>>.(((..<<..>>..&..<<....>>..)))...)))." -e="NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN&NNNNNNNNNNNNNNNNNNNNNN" -c=distinct -o=TEST',
    'SCRIPT -u="....(((......&..))).." -e="NNNNNNNNNNNNN&NNNNNNN" -o=TEST'
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
   

