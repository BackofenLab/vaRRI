import re

def checkStructureInputSimple(structure):
	# check if the struture has only valid basepairs
	# ie for every open bracket, one closing bracket
	basepairs = 0
	for char in structure:
		if char == "(":
			basepairs += 1
		if char == ")":
			basepairs -= 1
		if basepairs < 0:
			raise ValueError("The number of brackets dont line up: Too many closing brackets")
	if basepairs > 0:
		raise ValueError("The number of brackets dont line up: Too many opening brackets")

def sameLength(structure, sequence):
	return len(structure) == len(sequence)

def split(string):
	'''
	Always retruns 2 strings even if there is no &	
	'''
	first = string.split("&")[0]
	second = string.split("&")[1] if "&" in string else ""
	return first, second
	
def validateHighlighting(args: dict):
	input_highlighting = args["highlighting"]
	valid_highlighting = ["nothing", "basepairs", "region"]
	if input_highlighting in valid_highlighting:
		return input_highlighting
	raise ValueError(f"The given highlighting input ({input_highlighting}) " +
				  		"is not accepted [nothing, basepairs, region]") 


def formatStructure(validated: dict):
	structure = validated["structure"]
	# basic formating
	first_struc, second_struc = split(structure)

	# fix fornac Error: incorrectly cutting of the first 2 nodes in the second sequence
	# HACK gegebenenfalls fixen wenn fornac updated
	structure = structure.replace("&", "&..")
	return first_struc, second_struc, structure

def formatSequence(validated: dict):
	sequence = validated["sequence"]
	# basic formating
	first_seq, second_seq = split(sequence)

	# fix fornac Error: incorrectly cutting of the first 2 nodes in the second sequence
	# HACK gegebenenfalls fixen wenn fornac updated
	sequence = sequence.replace("&", "&..")
	return first_seq, second_seq, sequence

def getMolecules(validated: dict):
	# returns how many molecules given. either one or two
	if validated["sequence2"] != "" or validated["structure2"] != "":
		assert validated["sequence2"] != ""
		assert validated["structure2"] != ""
		return "2"
	return "1"

def validateStructureInput(args: dict, validated: dict):
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

	if not sameLength(structure, sequence):
		# if the sequence and the structure do not have the same length
		# raise Error
		raise ValueError(f"Structure length ({len(structure)}) and Sequence length ({len(sequence)}) do not match")
	
	
	if re.fullmatch("([\.()]+&)?[\.()]+", structure):
		# make sure all basepairs work
		#checkStructureInputSimple(structure)
		return structure
	if structure == "":
		raise ValueError("No structure given")
	raise ValueError(f"The given structure input is not valid: {structure}")


def validateSequenceInput(args: dict):
	sequence = args["sequence"]

	# making sure the sequnce is in the right format: ([AGUC]+&)?[AGUC]+
	if re.fullmatch("([AGCU]+&)?[AGCU]+", sequence):
		return sequence
	# check if no sequences was given
	if sequence == "":
		raise ValueError("No sequences is given")

	raise ValueError(f"The given sequence input has invalid characters: {sequence}")

def validateOffset(args : dict, offset: str):
	if re.fullmatch("-?\d+", args[offset]):
		return int(args[offset])
	raise ValueError(f"The given offset input is not valid: {args[offset]}")
	
def validateOutput(args: dict):
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
		raise ValueError("The sepcified output file type is not accepted. Allowed types are svg and png")
	
	return (output_path + output_file_name, output_file_type)
		
	
def validateColoring(args: dict):
	coloring = args["coloring"]
	if coloring in ["default", "distinct"]:
		return coloring
	raise ValueError("The given coloring input is not accepted (only default or distinct)")

def checkHybridInput(hybrid, sequence, offsets):
	# make sure that both sequences have the same structre
	structures = re.findall("[\.|]+", hybrid)
	starts = [int(start) for start in re.findall("-?\d+", hybrid)]
	assert len(structures) == 2
	if structures[0] != structures[1]:
		raise ValueError("The given hybrid input has 2 different structures")
	
	# make sure the hybrid input is within bounds of the sequences
	sequences = re.findall("[AGCU]+", sequence)
	assert len(sequences) == 2
	for seq, struc, offset, start in zip(sequences, structures, offsets, starts):
		if len(seq) + offset < len(struc) + start: 
			raise ValueError("The given hybrid input is not within the bounds of the sequence:" \
			f"end Sequence: {len(seq) + offset} end interaction {len(struc) + start}")
		if offset > start: 
			raise ValueError("The given hybrid input is not within the bounds of the sequence:" \
			f"start Sequence: {offset} start interaction: {start}")        

def transformHybridDB(hybrid_input: str, sequence: str, offsets: tuple):
    # takes input of form: 6|||..&3|||.. and returns a sctructure string
    # TODO explain what im doing here
    offset_1, offset_2 = offsets
    seq_1, seq_2 = sequence.split("&")
    hyb_1, hyb_2 = hybrid_input.split("&")

    structure = {}
    structure["1"] = ""
    structure["2"] = ""

    for seq, hyb, offset, num in [(seq_1, hyb_1, offset_1, "1"), (seq_2, hyb_2, offset_2, "2")]:
        inter_seq = re.search("[\.|]+", hyb).group()
        start = int(re.search("-?\d+", hyb).group())
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

    return structure["1"].replace("|","(") + "&" + structure["2"].replace("|",")")

