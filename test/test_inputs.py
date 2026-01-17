import hashlib
import logging
import os
import subprocess

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
    # basic test
    'python3.10 ../source/rna_to_img.py --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=images/TEST',
    # offset images
    'python3.10 ../source/rna_to_img.py --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=images/TEST --offset1=666 --offset2=666',
    'python3.10 ../source/rna_to_img.py --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=images/TEST --offset1=-666 --offset2=666 -c=distinct',
    'python3.10 ../source/rna_to_img.py --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAUGAGCAUACGACAGCAG" -o=images/TEST --offset1=-666 --offset2=-666 -c=distinct',
    'python3.10 ../source/rna_to_img.py --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=images/TEST --offset1=666 --offset2=-666 -c=distinct',
    'python3.10 ../source/rna_to_img.py --structure="..((((...))))...((...((...((..&............))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAUGAGCAUACGACAGCAG" -o=images/TEST --offset1=-666 --offset2=-666 -c=distinct',
    # hybrid input images
    'python3.10 ../source/rna_to_img.py -u="1|||&5|||" --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=images/TEST -c=distinct',
    'python3.10 ../source/rna_to_img.py -u="100|||&205|||" --sequence="ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG" -o=images/TEST -c=distinct -o1=99 -o2=200 -i=basepairs',
    'python3.10 ../source/rna_to_img.py --structure="..((((...))))...((...((..(((...))).((.....&...))...))...)).." --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAA&AGAGCAUACGACAGCAG" -o=images/TEST -c=distinct -o1=-2 -o2=2000 -i=basepairs',
    # single molecule images
    'python3.10 ../source/rna_to_img.py --structure="..((((...))))...((...((..(((...))).((.....))))))" --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAAAAAAAA" -o=images/TEST -c=distinct -o1=-2 -o2=2000 -i=basepairs',
    'python3.10 ../source/rna_to_img.py --structure="..((((...))))...((...((..(((...))).((.....))))))" --sequence="ACGAUCAGAGAUCAGAGCAUACGACCCCAAAGGGAGCAGAAAAAAAAA" -o=images/TEST -c=distinct -o1=-2 -o2=2000 -i=region',
    # multiple intermolecular basepairs images
    'python3.10 ../source/rna_to_img.py --structure="(((((...)))..))&..(((((...)))))" --sequence="GGGCGAAACGCCAAA&AACCCGAAACGGGAA" -o=images/TEST -c=default -o1=-2 -o2=-2 -i=basepairs',
    'python3.10 ../source/rna_to_img.py --structure="....(((..(((&))..)))..)" --sequence="AUAUGCGAAUUG&CGCAAUUCGA" -o=images/TEST -c=default -o1=-2 -o2=-2 -i=basepairs',
]


for index, command in enumerate(inputs):
    test_name = f"test{index}.svg"
    logging.info(f"Running {test_name}...")
    command = command.replace("TEST", test_name)
    subprocess.run(command, shell=True)
    test = hashfile(f"images/{test_name}")
    verified = hashfile(f"verified/{test_name}")
    if test and verified and test == verified:
        logging.info(f"{test_name} passed!")
        os.remove(f"images/{test_name}")
    else:
        logging.error(f"{test_name} failed!")
    # remove if no Errors
   

