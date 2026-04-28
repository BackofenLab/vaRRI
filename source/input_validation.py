import re
import logging
from utils import (listIntermolNodes, runCommand)
from pathlib import Path

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
    # () <> [] {}
    basepairs = {"(": 0, "<": 0, "[": 0, "{": 0}
    closing_bp = {")": "(", ">": "<", "]": "[", "{": "}"}

    for char in structure:
        if char in basepairs:
            basepairs[char] += 1
        if char in closing_bp:
            open_bp = closing_bp[char]
            basepairs[open_bp] -= 1        
            if basepairs[open_bp] < 0:
                raise ValueError(f"The number of brackets dont line up. Too many closing {char} brackets:\n" \
                f"{structure}")
        
    for bp, count in basepairs.items():
        if count > 0:
            raise ValueError(f"The number of brackets dont line up. Too many opening {bp} brackets:\n" \
                f"{structure}")


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


def validateBackgroundhighlighting(args: dict):
    """
    Validate the backgroundhighlighting option.

    Args:
        args: Argument dictionary containing the key 'backgroundhighlighting'.

    Returns:
        The validated backgroundhighlighting value.

    Raises:
        ValueError: If the backgroundhighlighting value is not accepted.
    """

    input_backgroundhighlighting = args["backgroundhighlighting"]
    valid_backgroundhighlighting = ["nothing", "basepairs", "region"]
    if input_backgroundhighlighting in valid_backgroundhighlighting:
        return input_backgroundhighlighting
    raise ValueError(f"The given backgroundhighlighting input ({input_backgroundhighlighting}) " +
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
    structure = structure.replace("&", "&...")
    bare_structure = structure.replace("&", "")

    structure_dict = {str(index): char for index, char in enumerate(bare_structure, 1)}

    return {"structure1": first_struc, "structure2": second_struc, 
            "structure": structure, "structure_dict": structure_dict}

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
    sequence = sequence.replace("&", "&...")
    bare_sequence = sequence.replace("&", "")
    sequence_dict = {str(index): char for index, char in enumerate(bare_sequence, 1)}

    return {"sequence1": first_seq, "sequence2": second_seq, 
            "sequence" :sequence, "sequence_dict": sequence_dict}

def getMolecules(validated: dict) -> str:
    """
    Determine the number of molecules.

    Checks whether a second sequence is present.

    Args:
        validated: Validated input dictionary.

    Returns:
        "1" if one molecule is present, otherwise "2".
    """
    assert "sequence2" in validated
    # returns how many molecules given. either 1 or 2
    if validated["sequence2"] != "":
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
    for var in ["sequence1", "sequence2", "offset1", "offset2"]:
        assert var in validated
    structure = args["structure"]
    sequence = args["sequence"]

    
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
    if coloring in ["loop", "strand"]:
        return coloring
    raise ValueError(f"The given coloring input is not accepted: {coloring} (accept only loop or strand)")

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
            raise ValueError("The given hybrid input is not within the bounds of the sequence: \n" \
            f"end of Sequence: {len(seq) + offset} \n end of interaction {len(struc) + start}")
        if offset > start: 
            raise ValueError("The given hybrid input is not within the bounds of the sequence: \n" \
            f"start of Sequence: {offset}  \n start of interaction: {start}")        

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

def validateLabelInterval(args: dict) -> str:
    """
    Validate the label interval option.

    Args:
        args: Argument dictionary containing the key 'labelInterval'.

    Returns:
        The validated label interval value as a string.

    Raises:
        ValueError: If the label interval is not a positive integer.
    """
    interval = args["labelInterval"]
    if int(interval) <= 1:
        raise ValueError(f"Label Interval must be 2 or higher and not {interval}")
    return interval


def validateSubsequenceInput(args: dict, v: dict, seq: str) -> tuple:

    name = "highlightSubseq" + seq
    offset = "offset" + seq
    sequence = "sequence" + seq
    if args[name] == "None":
        return None

    for var in [offset, sequence]:
            assert var in v

    startIndex = v[offset]
    endIndex = startIndex + len(v[sequence])
    # -----------------
    # highlightSubseq=index:index,index:index,....
    input_string = args[name]
    if re.fullmatch("(-?\d+:-?\d+,)*-?\d+:-?\d+", input_string):
        validated_subsequences = []
        for subsequence in input_string.split(","):
            start, end = [int(i) for i in subsequence.split(":")]
            if 0 in [start, end]:
                raise ValueError(f"The given {name} input has an invalid subsequence: " +
                                f"Allowed indicies i are [i<-1, 1<i]. Instead got {subsequence}")
            if start > end:
                raise ValueError(f"The given {name} input has an invalid subsequence: " +
                                f"Allowed start:end must follow rule [start<end], instead got: {subsequence}")
            if startIndex > start:
                raise ValueError(f"The given {name} input has an invalid subsequence: " +
                                f"startIndex of Molecule{seq} ({startIndex}) must be " +
                                f"smaller than start of subsequence ({start})")
            if endIndex < end:
                raise ValueError(f"The given {name} input has an invalid subsequence: " +
                                f"endIndex of Molecule{seq} ({endIndex}) must be " + 
                                f"bigger than end of subsequence ({end})")
            validated_subsequences += [(start, end)]
        return validated_subsequences
    
    raise ValueError(f"The given {name} input is invalid: {input_string}")

def validateCropping(args, mol):
    crop = args[f"crop{mol}"]
    if crop == "None": return None
    if re.fullmatch("\d+", crop):
        return int(crop)
    return ValueError    


def croppingInput(v, args):
    for var in ["molecules", "structure1", "structure2", "sequence1", "sequence2",
              "crop1", "crop2", "offset1", "offset2", 
              "highlightSubseq1", "highlightSubseq2"]:
        assert var in v

    # only makes sense in an intermolecular setting
    if v["molecules"] == 2:
        return v
    
    # all variables that may change
    structure ={1: v["structure1"], 2: v["structure2"]}
    sequence ={1: v["sequence1"], 2: v["sequence2"]}
    crop = {1: v["crop1"], 2: v["crop2"]}
    startIndex = {1: v["offset1"], 2: v["offset2"]}
    endIndex = {1: 0, 2: 0}
    subsequence = {1: str(v["highlightSubseq1"]), 2: str(v["highlightSubseq2"])}

    # if no cropping is needed, return without changing anything
    if crop[1] is None and crop[2] is None:
        return {}

    # get the intermolecular region indicies
    region = []
    for mol, struc in structure.items():
        intermol = [i for i,_ in listIntermolNodes(struc)]
        if intermol:
            # if there are intermolecular basepairs
            region += [(intermol[0], intermol[-1])]
        else:
            # if not, let it skip
            region+= [(0,0)]
            crop[mol] = None

    # ---------------------------------------------------------------
    # NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
    # remove ->|<-crop--|intermol-region|--crop->|<- remove
    # iterate through the 2 molecules
    for mol, (start, end) in enumerate(region, 1):
        # if no copping set, change nothing for this molecule 
        if crop[mol] is None:
            continue

        end_structure = len(structure[mol])
        # start and end based 1 -> based 0
        start, end = start-1, end-1
        # after cropping, the new submolecule is between start_crop and end_crop
        bigger_than_0 = start - crop[mol] > 0 
        smaller_than_end = end + crop[mol] < end_structure
        start_crop = start - crop[mol] if bigger_than_0 else 0 
        end_crop = end + crop[mol] if smaller_than_end else end_structure

        # crop substring: [start index : end Index + 1]
        structure[mol]= structure[mol][start_crop:end_crop+1] 
        sequence[mol]= sequence[mol][start_crop:end_crop+1]

        # start crop is based 0
        # we dont count with 0
        crosses_zero = startIndex[mol] < 0 and startIndex[mol] + start_crop >= 0
        startIndex[mol] += start_crop + 1 if crosses_zero else start_crop
        endIndex[mol] = startIndex[mol] + len(structure[mol])

        # skip cropping the subsequences if they are set to None
        if subsequence[mol] == "None":
            continue
        # crop the subsequences 
        subsequence[mol] = []
        for (start_sub, end_sub) in v[f"highlightSubseq{mol}"]:
            if start_sub > endIndex[mol]: continue
            if end_sub < startIndex[mol]: continue
            bigger_than_start = startIndex[mol] < start_sub
            smaller_than_end = endIndex[mol] > end_sub
            new_start_sub = start_sub if bigger_than_start else startIndex[mol]
            new_end_sub = end_sub if smaller_than_end  else endIndex[mol]
            subsequence[mol] += [(new_start_sub, new_end_sub)]

        if subsequence[mol] == "":
            subsequence[mol] = "None"
        subsequence[mol] = ",".join([f"{s}:{e}" for (s,e) in subsequence[mol]])


    args["startIndex1"] = str(startIndex[1])
    args["startIndex2"] = str(startIndex[2])
    args["sequence"] = "".join(sequence[1]) + "&" + "".join(sequence[2])
    args["structure"] = "".join(structure[1]) + "&" + "".join(structure[2]) 
    args["highlightSubseq1"] = subsequence[1]
    args["highlightSubseq2"] = subsequence[2]
    args["fastafile"] = "None"
    args["structurePrediction"] = False

    return validate(args)


def validate(args):
    validated = {}

    validated["offset1"] = validateOffset(args, "startIndex1")
    validated["offset2"] = validateOffset(args, "startIndex2")
    # no validation possible / needed
    validated["RNAfold"] = args["RNAfold"]    
    validated["RNAplfold"] = args["RNAplfold"]
    validated["guBasepairs"] = args["guBasepairs"]


    # --------------------------------------------------------------
    # fasta input
    if args["fastafile"] != "None":
        if args["sequence"] != "":
            raise ValueError("Invalid combination of Inputs: \n" \
                f"sequence input either through fasta file or through --sequence String. not both")
        args["sequence"] = validateInputFile(args)


    # -------------------------------------------------------------
    # validate and format sequence Input
    validated["sequence"] = validateSequenceInput(args)

    # "sequence1" and "sequence2" are data only
    # update: {"sequence1", "sequence2", "sequence", "sequence_dict"}
    validated.update(formatSequence(validated))

    # -----------------------------------------------------------------
    # check if hyrbidInput was used, 
    # transform Hyrbid input into dot-bracket input
    args["structure"] = checkforHybridInput(args, validated)
    # structure and sequence wont change anymore. check if they have the same length
    checkSameLength(args)
    
    logging.info("hybrid check completed")
    # --------------------------------------------------------------
    # validate and format structure input
    # make sure sequence and structure input have the same length

    validated["structure"] = validateStructureInput(args, validated)

    # if enabled, use structure prediction for intramolecular structure
    validated["molecules"] = getMolecules(validated)
    validated["structurePrediction"] = validateStructurePredictionInput(args)

    if validated["structurePrediction"] == True:
        validated["structure"] = predictIntramolStructure(validated)

    # if an interaction between 2 Molecules is given, fornac does not display 
    # the first 2 nucelotides of the second molecule. 
    # in the variables "structure" and "sequence" a fix has been added
    # but "structure1" and "structure2" are data only and do not have the fix
    # update: {"structure1", "structure2", "structure", "structure_dict"}
    validated.update(formatStructure(validated))




    # --------------------------------------------------------------
    # rest

    validated["output_name"], validated["output_type"] = validateOutput(args)

    validated["coloring"] = validateColoring(args)

    validated["highlighting"] = validateHighlighting(args)

    validated["backgroundhighlighting"] = validateBackgroundhighlighting(args)

    validated["labelInterval"] = validateLabelInterval(args)

    validated["accessibility1"] = validateAccessibilityInput(args, "accessibility1")
    validated["accessibility2"] = validateAccessibilityInput(args, "accessibility2")

    for i in ("1","2"):
        validated[f"highlightSubseq{i}"] = validateSubsequenceInput(args, validated, i)
        validated[f"crop{i}"] = validateCropping(args, "") if args["crop"] != "None" else validateCropping(args, i)

    return validated

def checkforHybridInput(args, v):
    offset_1 = v["offset1"]
    offset_2 = v["offset2"]
    structure = args["structure"]
    sequence = args["sequence"]
    
    if re.fullmatch("(-?\d+[|\.]+)&(-?\d+[|\.]+)", structure):
        # identifyed hybrid input, only works if there are 2 sequences
        # make sure both have the same structure 
        # and both structures are within the sequences bounds
        # depends on valid: sequence, structure and offset input

        # TODO why did this input get accepted? -u="...||||||...&3.|||....|||"

        checkHybridInput(structure, sequence, (offset_1, offset_2))

        # transform hybrid input to valid stracture input
        structure = transformHybridDB(structure, sequence, (offset_1, offset_2))
    
    return structure


def validateStructurePredictionInput(args):
    assert "structurePrediction" in args
    if args["structurePrediction"] in [True, False]:
        return args["structurePrediction"]
    raise ValueError("The given structurePrediction Input is invalid, " \
    f'only True or False allowed. Instead received: {args["structurePrediction"]}')

def validateAccessibilityInput(args, key):
    assert key in args
    if args[key] == "None":
        return None
    if args[key] == "RNAplfold":
        return "RNAplfold"
    if Path(args[key]).exists():
        return args[key]
    raise ValueError(f"The given Input File could not be found: {args[key]}")




def checkSameLength(args):
    for parameter in ["structure", "sequence"]:
        assert parameter in args
    structure, sequence = args["structure"], args["sequence"]
    if not sameLength((structure, sequence)):
        # if the sequence and the structure do not have the same length
        # raise Error
        raise ValueError(f"Structure length ({len(structure)}) and Sequence length ({len(sequence)}) do not match")


def validateInputFile(args):
    inputFile = args["fastafile"]
    
    if not Path(inputFile).exists():
        raise ValueError(f"The given Input File could not be found: {inputFile}")

    # parse fasta file
    sequences = parse_fasta(inputFile)

    # make sure, there are no more than 2  sequences given
    if len(sequences.values()) > 2:
            raise ValueError(f"No more than 2 input sequences allowed. Found {len(sequences)}")
    
    return "&".join(sequences.values())

def parse_fasta(file_path):
    sequences = {}
    current_titel = None
    current_seq = []

    with open(file_path) as f:
        seq_counter = 1
        for line in f:
            line = line.strip()
            if not line:
                continue

            if line.startswith(">"):
                if current_titel:
                    sequences[current_titel] = "".join(current_seq)

                current_titel = line[1:] + str(seq_counter)
                seq_counter += 1
                current_seq = []
            else:
                if current_titel is None:
                    raise ValueError("FASTA-Formatfehler: Sequenz ohne Header")
                current_seq.append(line)

        if current_titel:
            sequences[current_titel] = "".join(current_seq)

    return sequences

def predictIntramolStructure(v):
    # works for 1 and 2 sequences
    mols = ["1"] if v["molecules"] == "1" else ["1", "2"]
    structure = {}

    for mol, string in enumerate(v["structure"].split("&"), 1):
        structure[str(mol)] = string

    parameters = v["RNAfold"]

    for mol in mols:
        seq = v[f"sequence{mol}"]
        struc = structure[mol]
        structure[mol] = predictSequence(struc, seq, parameters)



    return "&".join(structure.values())

    

def predictSequence(inter_structure, sequence, parameters):
    # predict intramol structure for a given sequence and structure
    # the intermolecular structure stays preserved
    # prepare the RNA fold call
    RNAfoldcall = f"RNAfold --noPS -C {parameters} << EOF\nSEQ\nCONSTRAINTS\nEOF"
    constraint = "".join([char if char == "." else "x" for char in inter_structure])
    call = RNAfoldcall.replace("SEQ", sequence).replace("CONSTRAINTS", constraint)
    intra_structure = runCommand(call, r"([\.()]+)")    

    # predicted Intramol structure should use < > brackets, 
    # to seperate from intermol structure
    intra_structure = intra_structure.replace("(", "<").replace(")", ">")
    # combine inter and intramolecular structure. They are mutual exclusive
    combined = [inter if inter!="." else intra for 
            intra, inter in zip(intra_structure, inter_structure)]

    return "".join(combined)    
