import re
import logging

def checkStructureInputSimple(structure: str) -> None:
    """
    Validate a structure string for correctly paired brackets.

    Ensures that round brackets `()` and angle brackets `<>` are
    properly opened and closed. For every opening bracket there must
    be a corresponding closing bracket.

    Args:
        structure: Structure string containing '.', '()', '<>' and
            optionally '&'.

    Raises:
        ValueError: If there are too many opening or closing brackets.
    """
    # check if the struture has only valid basepairs
    # ie for every open bracket, one closing bracket
    smooth_basepairs = 0
    edgy_basepairs = 0
    for char in structure:
        smooth_basepairs += 1 if char == "(" else 0
        smooth_basepairs -= 1 if char == ")" else 0

        if smooth_basepairs < 0:
            raise ValueError("The number of brackets dont line up: Too many closing ) brackets")
        
        edgy_basepairs += 1 if char == "<" else 0
        edgy_basepairs -= 1 if char == ">" else 0

        if edgy_basepairs < 0:
            raise ValueError("The number of brackets dont line up: Too many closing > brackets")

    if smooth_basepairs > 0:
        raise ValueError("The number of brackets dont line up: Too many opening ) brackets")
    if edgy_basepairs > 0:
        raise ValueError("The number of brackets dont line up: Too many opening > brackets")

def sameLength(ab: tuple) -> bool:
    """
    Check whether two strings have the same length.

    Args:
        ab: Tuple containing two strings.

    Returns:
        True if both strings have the same length, otherwise False.
    """
    a, b = ab
    return len(a) == len(b)

def split(string: str) -> tuple[str, str]:
    """Split a string at an optional '&' character.

    Always returns exactly two strings. If no '&' is present,
    the second string will be empty.

    Args:
        string: Input string, optionally containing '&'.

    Returns:
        A tuple containing the first and second part.
    """
    first = string.split("&")[0]
    second = string.split("&")[1] if "&" in string else ""
    return (first, second)
    
def validateHighlighting(args: dict):
    """
    Validate the highlighting option.

    Args:
        args: Argument dictionary containing the key 'highlighting'.

    Returns:
        The validated highlighting value.

    Raises:
        ValueError: If the highlighting value is not accepted.
    """

    input_highlighting = args["highlighting"]
    valid_highlighting = ["nothing", "basepairs", "region"]
    if input_highlighting in valid_highlighting:
        return input_highlighting
    raise ValueError(f"The given highlighting input ({input_highlighting}) " +
                          "is not accepted [nothing, basepairs, region]") 


def formatStructure(validated: dict) -> tuple[str, str, str]:
    """
    Format the structure for further processing.

    Splits the structure into two parts and fixes a known Fornac issue
    by inserting two dots after '&'.

    Args:
        validated: Dictionary containing the key 'structure'.

    Returns:
        A tuple containing:
        - first structure
        - second structure
        - corrected full structure
    """
    assert "structure" in validated
    structure = validated["structure"]
    # basic formating
    first_struc, second_struc = split(structure)

    # fix fornac Error: incorrectly cutting of the first 2 nodes in the second sequence
    # HACK gegebenenfalls fixen wenn fornac updated
    structure = structure.replace("&", "&..")
    return first_struc, second_struc, structure

def formatSequence(validated: dict) -> tuple[str, str, str]:
    """
    Format the sequence for further processing.

    Splits the sequence into two parts and fixes a known Fornac issue
    by inserting two dots after '&'.

    Args:
        validated: Dictionary containing the key 'sequence'.

    Returns:
        A tuple containing:
        - first sequence
        - second sequence
        - corrected full sequence
    """
    assert "sequence" in validated
    sequence = validated["sequence"]
    # basic formating
    first_seq, second_seq = split(sequence)

    # fix fornac Error: incorrectly cutting of the first 2 nodes in the second sequence
    # HACK gegebenenfalls fixen wenn fornac updated
    sequence = sequence.replace("&", "&..")
    return first_seq, second_seq, sequence

def getMolecules(validated: dict) -> str:
    """
    Determine the number of molecules.

    Checks whether a second sequence or structure is present.

    Args:
        validated: Validated input dictionary.

    Returns:
        "1" if one molecule is present, otherwise "2".
    """
    for var in ["sequence2", "structure2"]:
        assert var in validated
    # returns how many molecules given. either one or two
    if validated["sequence2"] != "" or validated["structure2"] != "":
        assert validated["sequence2"] != ""
        assert validated["structure2"] != ""
        return "2"
    return "1"

def validateStructureInput(args: dict, validated: dict):
    """
    Validate and normalize structure input.

    Supports both standard structure strings and hybrid notation.
    Ensures that structure and sequence lengths are compatible.

    Args:
        args: Raw argument dictionary containing 'structure'.
        validated: Dictionary with validated values (sequence, offsets).

    Returns:
        The validated structure string.

    Raises:
        ValueError: If the structure is invalid or inconsistent with
            the sequence.
    """
    for var in ["sequence", "offset1", "offset2"]:
        assert var in validated
    structure = args["structure"]
    sequence = validated["sequence"]
    offset_1 = validated["offset1"]
    offset_2 = validated["offset2"]
    
    if re.fullmatch("(-?\d+[|\.]+)&(-?\d+[|\.]+)", structure):
        # identifyed hybrid input, only works if there are 2 sequences
        # make sure both have the same structure 
        # and both structures are within the sequences bounds
        # depends on valid: sequence, structure and offset input

        checkHybridInput(structure, sequence, (offset_1, offset_2))

        # transform hybrid input to valid stracture input
        structure = transformHybridDB(structure, sequence, (offset_1, offset_2))

    if not sameLength((structure, sequence)):
        # if the sequence and the structure do not have the same length
        # raise Error
        raise ValueError(f"Structure length ({len(structure)}) and Sequence length ({len(sequence)}) do not match")
    
    if "&" in structure:
        # make sure that for both molecules, structure and sequence have the same length
        struc_1, struc_2 = split(structure)
        seq_1, seq_2 = split(sequence)
        for (index, struc, seq) in [(1, struc_1, seq_1), (2, struc_2, seq_2)]:
            if len(struc) != len(seq):
                raise ValueError(f"Structure length ({len(struc)}) and Sequence length ({len(seq)}) " +
                     f"of molecule {index} do not match")

    
    
    if re.fullmatch("([\.()<>\[\]{}]+&)?[\.()\[\]<>{}]+", structure):
        # make sure all basepairs work
        checkStructureInputSimple(structure)
        return structure
    if structure == "":
        raise ValueError("No structure given")
    raise ValueError(f"The given structure input is not valid: {structure}")


def validateSequenceInput(args: dict) -> str:
    """
    Validate sequence input.

    Only RNA sequences consisting of  IUPAC code allowed,
    optionally separated by '&'.

    Args:
        args: Argument dictionary containing the key 'sequence'.

    Returns:
        The validated sequence string.

    Raises:
        ValueError: If the sequence is empty or contains invalid characters.
    """
    sequence = args["sequence"]

    # making sure the sequnce is in the right format: ([AGUC]+&)?[AGUC]+
    if re.fullmatch("([aAcCgGtTuUrRyYsSwWkKmMbBdDhHvVnN]+&)?" \
    "[aAcCgGtTuUrRyYsSwWkKmMbBdDhHvVnN]+", sequence):
        return sequence
    # check if no sequences was given
    if sequence == "":
        raise ValueError("No sequences is given")

    raise ValueError(f"The given sequence input has invalid characters: {sequence}")

def validateOffset(args : dict, offset: str) -> int:
    """
    Validate and convert an offset value.

    Args:
        args: Argument dictionary.
        offset: Key name of the offset value in the dictionary.

    Returns:
        The offset as an integer.

    Raises:
        ValueError: If the offset value is not a valid integer.
    """
    if args[offset] == "0":
        raise ValueError(f"Index 0 is not valid, use either <=-1 or >=1")
    if re.fullmatch("-?\d+", args[offset]):
        return int(args[offset])
    raise ValueError(f"The given index input is not valid: {args[offset]}")
    
def validateOutput(args: dict) -> tuple[str, str]:
    """
    Validate the output file name and file type.

    Adds a default file extension (.svg) if none is specified and
    validates the output file type.

    Args:
        args: Argument dictionary containing the key 'output'.

    Returns:
        A tuple containing:
        - full output path without extension
        - output file type ('svg' or 'png')

    Raises:
        ValueError: If the output file name or file type is invalid.
    """
    output: str = args["output"]
    valid_output_file_types = ["svg", "png"]

    # check if the outpuf file name is specified.
    if output == "":
        raise ValueError("The Output file name is not specified")

    # we only want to look at the last part of the path:
    # eg dir1/subdir/file.test <-
    output_path_last = output.split("/")[-1]

    # if no type is specified, then add default type svg
    if "." not in output_path_last:
        output_path_last += ".svg"
    if output_path_last.count(".") > 1:
        raise ValueError("Too many . in the outputfile name, only allowed 1")
    
    output_file_name, output_file_type = output_path_last.split(".")
    match = re.search(".*\/", output) 
    output_path = match.group() if match else ""
    if output_file_type not in valid_output_file_types:
        raise ValueError(f"The sepcified output file type is not accepted: {output_file_type}" \
        " Allowed types are svg and png")
    
    return (output_path + output_file_name, output_file_type)
        
    
def validateColoring(args: dict) -> str:
    """
    Validate the coloring option.

    Args:
        args: Argument dictionary containing the key 'coloring'.

    Returns:
        The validated coloring value.

    Raises:
        ValueError: If the coloring value is invalid.
    """
    coloring = args["coloring"]
    if coloring in ["default", "distinct"]:
        return coloring
    raise ValueError(f"The given coloring input is not accepted: {coloring} (accept only default or distinct)")

def checkHybridInput(hybrid, sequence, offsets) -> None:
    """
    Validate hybrid structure input.

    Ensures that both hybrid structures are identical and that
    the hybrid interaction is within the sequence bounds.

    Args:
        hybrid: Hybrid structure string.
        sequence: Combined sequence string containing '&'.
        offsets: Offsets for both sequences.

    Raises:
        ValueError: If the hybrid structure is inconsistent or out of bounds.
    """
    # make sure that both sequences have the same structre
    structures = re.findall("[\.|]+", hybrid)
    starts = [int(start) for start in re.findall("-?\d+", hybrid)]
    assert len(structures) == 2
    # both molecules need to have the same number of |
    if structures[0].count("|") != structures[1].count("|"):
        raise ValueError("The given hybrid input has no matching amount of basepairs " \
        "both molecules should have the same number of |")
    
    # make sure the hybrid input is within bounds of the sequences
    sequences = re.findall("[aAcCgGtTuUrRyYsSwWkKmMbBdDhHvVnN]+", sequence)
    assert len(sequences) == 2
    for seq, struc, offset, start in zip(sequences, structures, offsets, starts):
        if len(seq) + offset < len(struc) + start: 
            raise ValueError("The given hybrid input is not within the bounds of the sequence:" \
            f"end Sequence: {len(seq) + offset} end interaction {len(struc) + start}")
        if offset > start: 
            raise ValueError("The given hybrid input is not within the bounds of the sequence:" \
            f"start Sequence: {offset} start interaction: {start}")        

def transformHybridDB(hybrid_input: str, sequence: str, offsets: tuple) -> str:
    """Transform a hybrid representation into a structure string.

    Converts a hybrid input of the form `6|||..&3|||..` into a
    standard structure string using parentheses.

    Args:
        hybrid_input: Hybrid structure input.
        sequence: Sequence input containing '&'.
        offsets: Offsets for both sequences.

    Returns:
        The transformed structure string.
    """
    # takes input of form: 6|||..&3|||.. and returns a sctructure string
    offset_1, offset_2 = offsets
    seq_1, seq_2 = sequence.split("&")
    hyb_1, hyb_2 = hybrid_input.split("&")

    structure = {}
    structure["1"] = ""
    structure["2"] = ""

    for seq, hyb, offset, num in [(seq_1, hyb_1, offset_1, "1"), (seq_2, hyb_2, offset_2, "2")]:
        # the hybrid structure part
        inter_seq = re.search("[\.|]+", hyb).group()
        # the starting index
        start = int(re.search("-?\d+", hyb).group())
        # the ending index
        end = start + len(inter_seq)
        # match subsequence of the interaction to the index in the sequence
        # replace[index in the sequence] = |
        # replace[-10] = |
        replace = {}
        for index, pos in enumerate(range(start, end)):
            replace[pos] = inter_seq[index]
        
        start = offset
        end = start + len(seq)
        # now iterating over the whole sequence starting at the offset
        # if we iterate through the subsequence, replace it
        for index, pos in enumerate(range(start, end)):
            structure[num] += "." if pos not in replace else replace[pos]
        
    logging.info(f'structure: {str(structure["1"].replace("|","(") + "&" + structure["2"].replace("|",")"))}')

    return structure["1"].replace("|","(") + "&" + structure["2"].replace("|",")")
