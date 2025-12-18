from pathlib import Path
import time
import argparse
# playwright version: pytest-playwright-0.7.2
from playwright.sync_api import sync_playwright
import urllib.parse
import re
import traceback

# -----------------------------------------------------------------
project_dir = Path(__file__).resolve().parent.parent.absolute()
working_dir = Path(__file__).resolve().parent.absolute()
# get the path to fornac.css and template_barebone.html
fornac_css = project_dir / "fornac" / "fornac.css"
template_barebone_html = project_dir / "example_html" / "template_barebone.html"
# set the path and create the name of the new file without the file type
path_rna_timestamp = working_dir / ("rna_" + str(time.time()))

# -----------------------------------------------------------------
# creating the elemnts for the svg file:
svg_header = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"> \n'
svg_footer = '\n</svg>'
svg_style = ''

try:
    assert (fornac_css).exists()
    with open(fornac_css, "r") as f:
    	svg_style = '<style type="text/css">\n' + f.read() + '\n</style>\n'
except Exception as e:
    print("Error reading fornac.css: ")
    print(e)

def sequence_coloring(first_seq, second_seq) -> list:
    color = []
    color += ["lightsalmon" for _ in first_seq]
    color += ["lightgreen" for _ in second_seq]

    return color

def validNumber(number: str) -> bool:
    # check if the given string is either a valid negative or postiv number
    if "-" in number:
        number = number[1:]
    return number.isdigit()

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



# -----------------------------------------------------------------
# open a headless chromium browser instance and load html file with
# FornaContainer. Extract the created svg into a seperated svg file
def run(structure, sequence, file_name, file_type, coloring_type="default", offset_1 = 0, offset_2 = 0):
    try:
        with sync_playwright() as p:
            # basic formating
            first_seq = sequence.split("&")[0]
            second_seq = sequence.split("&")[1] if "&" in sequence else ""
            first_struc = structure.split("&")[0]
            second_struc = structure.split("&")[1] if "&" in structure else ""

            # start browser and load page with fornac script
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            assert template_barebone_html.exists()
            page.goto("file:///" + str(template_barebone_html))

            # fix fornac Error: incorrectly cutting of the first 2 nodes in the second sequence
            # HACK gegebenenfalls fixen wenn fornac updated
            structure_fix = structure.replace("&", "&..")
            sequence_fix = sequence.replace("&", "&ee")
			
			# use fornac to generate structure
            page.evaluate("""([structure, sequence]) => {
					var container = new fornac.FornaContainer("#rna_ss", {'animation': false});
					var options = {'structure': structure,
								'sequence': sequence
					};
					container.addRNA(options.structure, options);
				}""", [structure_fix, sequence_fix])

            # -----------------------------------------------------
            # changing the background color
            coloring = []
            # this option colors all nucleotides of one sequence in one color
            if coloring_type == "distinct":
                coloring = sequence_coloring(first_seq, second_seq)
            
            # color all circles with the given color in the coloring list
            page.evaluate("""(coloring) => {
                    function coloringTheCircles(coloring) {
                        if (coloring.length == 0) {return;}
                        var list_of_nodes = document.querySelectorAll('[r="5"]');
                        for (const [index, node] of Object.entries(list_of_nodes)){            
                            node.setAttribute("style", "fill: " + coloring[index] + ";");
                        }
                    }
                    coloringTheCircles(coloring)
				}""", coloring)          
            

            # -----------------------------------------------------
            # changing the indexing number of each node
            # TODO more comments
            numbering = []
            for offset in [offset_1, offset_2]:
                numbering += [i for i in range(offset, len(first_seq)+offset, 1)]
                if 0 in numbering:
                    numbering.remove(0)
                    numbering += [numbering[-1] + 1]

            page.evaluate("""(numbering) => {
                    var list_of_nodes = document.querySelectorAll('[r="5"]');
                    for (const [index, node] of Object.entries(list_of_nodes)){
                        title_element = node.children[0];
                        title_element.innerHTML = numbering[index];
                    }
				}""", [str(i) for i in numbering])

            split =  len(first_seq)
            
            # adding the 2 empty nodes between the 2 sequences, 
            # because fornac counts them in when constructing index nodes
            numbering = numbering[:split] + ["e", "e"] + numbering[split:]

            # changing the indexing
            indexing = []
            # index for the first sequence
            indexing = [str(numbering[i]) for i in range(9, len(numbering)+1, 10)]

            page.evaluate("""(indexing) => {
                    var list_of_text_elements = document.querySelectorAll('[label_type="label"]');
                    for (const [index, node] of Object.entries(list_of_text_elements)){
                        node.innerHTML = indexing[index];                            
                    }
				}""", indexing)


            # -----------------------------------------------------
            # changing the basepair ring color
            end_of_seq1 = len(first_seq)
            page.evaluate("""(end_of_seq1) => {
                    var list_of_basepair_links = document.querySelectorAll('[link_type="basepair"]');
                    var basepair_indicies = [];
                    for (const [index, node] of Object.entries(list_of_basepair_links)){
                        text = node.children[0].innerHTML;
                        basepairs = text.split(":")[1];
                        basepair_node_1 = basepairs.split("-")[0];
                        basepair_node_2 = basepairs.split("-")[1];
                        if (basepair_node_1 < end_of_seq1 && basepair_node_2 > end_of_seq1) {                          
                            basepair_indicies.push(basepair_node_1);
                            basepair_indicies.push(basepair_node_2);
                        }
                    }
                          
                    for (const index of basepair_indicies){
                        node = document.querySelector('circle[node_num="' + index.toString() + '"]'); 
                        style = node.getAttribute("style");
                        node.setAttribute("style", style + "stroke: red;");
                    }
				}""", end_of_seq1)          


            # debugging:
            debug_text = page.locator("div").first.inner_html()
            print(debug_text)


			#  extracting the built svg file
            svg = page.locator("svg").first.inner_html()
            # combining all svg file elements in one string
            final_svg = svg_header + svg_style + svg + svg_footer

            # finalise file name
            if file_name == "default":
                path_file = working_dir / ("rna_" + str(time.time()) + "." + file_type)
            else:
                path_file = working_dir / (file_name + "." + file_type)
            
            
            if file_type == "png":
                # create a new page with the svg code and take a screenshot
                svg_page = browser.new_page()
                url_svg = urllib.parse.quote(final_svg)
                svg_page.goto(f"data:image/svg+xml,{url_svg}")
                svg_page.screenshot(path=path_file)
            if file_type == "svg":
    			# writing the svg code as a string into a file
                with open(path_file, "w") as f:
                    f.write(final_svg)
            
			# close chromium borwser
            browser.close()
    except Exception as e:
        print(f"Error found: {e}")
        print(traceback.print_exc())
        


# -----------------------------------------------------------------
# Input parameters for script: 
# structure | example ((..((....)).(((....))).))
# sequence | example CGCUUCAUAUAAUCCUAAUGACCUAU

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
			prog='rna_to_svg.py',
			description='takes as an input a rna structure and sequence and ' \
			'creates a svg with a grafical representation using fornac' \
			'example: \n ' \
			'python3.10 rna_to_svg.py "..((((...))))...((...((...((..&............))...))...)).." "ACGAUCAGAGAUCAGAGCAUACGACAGCAG&ACGAAAAAAAGAGCAUACGACAGCAG"')
    parser.add_argument(
			'-u',
            '--structure',
			help='structure of the rna, in dot-bracket notation',
            default="")
    parser.add_argument(
			'-e',
            '--sequence',
			help='sequence of the rna, out of the letters C,G,U and A',
            default="")
    parser.add_argument(
            '-o',
			'--output',
			help='give the output picture a name and a file type. ' \
            'Supported are svg and png. Default is svg',
            default='default.svg')
    parser.add_argument(
            '-c',
			'--coloring',
			help='how should the nucleotides be colored?' \
            'default: default coloring fornac' \
            'distinct: each sequence gets its own color',
            default='default')
    parser.add_argument(
            '-o1',
			'--offset1',
			help='with what offset should the indexing of the first sequence start?' \
            'default: 0',
            default="0")
    parser.add_argument(
            '-o2',
			'--offset2',
			help='with what offset should the indexing of the second sequence start if ther is one?' \
            'default: 0',
            default="0")
    parser.add_argument(
			'--hybridDB',
			help='additional version of inputing structure:  hybridDB="16||||||&9||||||"' \
            'default: False',
            default=False)
    
    # dictionary of all input variables
    args = vars(parser.parse_args())
    # dictionary of all validated input variables
    validated = {}

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

    def checkStructureInput(structure, sequence):
        # FUNKTIONIERT NICHT MIT PSEUDO KNOTS
        # ([)]
        # AGUC
        # possible basepairs: A-U, G-C, G-U
        # idee: ein U kann zu A und G paaren. so sei ein U-A paar
        # Wenn ein pseudoknot aber nun dazwischen kommt und das U mit einem G bindet
        # kann sich mit dem C und dem A kein paar mehr bilden
        # 
        # ich schließe mit einem inneren C ein äußeres G was eigentlich für eine GU paar vorgesehen war 

        # open c u close gc au
        # ([)]
        # CUGA  
        # open G A clos GU ERRO 
        # (())
        # GAUC
        
        # check structure and sequence having the same lenght
        if len(structure) != len(sequence):
            raise ValueError("structure and sequence dont have the same length")
        # check if the struture has only valid basepairs
        # ie for every open bracket, one closing bracket



        # possible basepairs: A-U, G-C, G-U
        combinations = {"A": ["U"], "U": ["A", "G"],
                        "G": ["C", "U"], "C": ["G"]}
        # basepairs = [(nucelotide, position)]
        left_basepairs = []
        for index, char in enumerate(structure):
            if char == "(":
                # for each ( add the nucelotide to the left basepair list
                left_basepairs += [(sequence[index], index)]
            if char == ")":
                # for each ) remove a pairing nuclotide in in hte left basepair list
                for matching_nucleo in combinations[sequence[index]]:
                    # makes a list out of all matching nucleotides (left)
                    matching_nucleos = [(n,i) for n,i in left_basepairs if n == matching_nucleo]
                    # remove the 
                    if matching_nucleo:
                        left_basepairs.remove(matching_nucleos[0])
                        break
                else:
                    raise ValueError(f"The right nucleotide {sequence[index]} on position {index}" +
                                     "does not have a matching nucleotide on its left: " +
                                     "The Structure and the sequence dont fit together")
        if len(left_basepairs) != 0:
            nucleo, index = left_basepairs.pop()
            raise ValueError(f"The left nucleotide {nucleo} on position {index}" + 
                             "has no matching nucleotide on its right:" +
                             "The Structure and the sequence dont fit together")







    def validateStructureInput(args: dict, validated: dict):
        structure = args["structure"]
        sequence = validated["sequence"]
        offset_1 = validated["offset1"]
        offset_2 = validated["offset2"]
        
        if re.fullmatch("(-?\d+[|\.]+)&(-?\d+[|\.]+)", structure):
            # identifyed hybrid input, only works if there are 2 sequences
            # make sure both have the same structure 
            # and both structures are within the sequences
            # depends on valid: sequence, structure and offset input

            checkHybridInput(structure, sequence, (offset_1, offset_2))

            # transform hybrid input to valid stracture input
            structure = transformHybridDB(structure, sequence, (offset_1, offset_2))
        
        if re.fullmatch("([\.()]+&)?[\.()]+", structure):
            # make sure all basepairs work
            checkStructureInputSimple(structure)
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

        raise ValueError("The given sequence input is not valid")
    
    def validateOffset(args : dict, offset: str):
        if re.fullmatch("-?\d+", args[offset]):
            return int(args[offset])
        raise ValueError(f"The given offset input is not valid: {args[offset]}")
        
    def validateOutput(args: dict):
        output_file: str = args["output"]
        valid_output_file_types = ["svg", "png"]

        # TODO allow filenames with path ie, with /
        # and check if path exists

        # check if the outpuf file name is specified.
        if output_file == "":
            raise ValueError("The Output file name is not specified")

        # if no type is specified, then add default type svg
        if "." not in output_file:
            output_file += ".svg"
        if output_file.count(".") > 1:
            raise ValueError("Too many . in the outputfile name, only allowed 1")
        
        output_file_name, output_file_type = output_file.split(".")

        if re.fullmatch("[-_]+", output_file_name):
            raise ValueError("Using only special Characters in outputfile name is not allowed")
        if output_file_type not in valid_output_file_types:
            raise ValueError("The sepcified output file type is not accepted. Allowed types are svg and png")
        if not re.fullmatch("[-_a-zA-Z\d]+", output_file_name):
            raise ValueError("The given output file name uses characters that are not allowed ([-_a-zA-Z\d]) ")
        
        return (output_file_name, output_file_type)
            
        
    def validateColoring(args: dict):
        coloring = args["coloring"]
        if coloring in ["default", "distinct"]:
            return coloring
        raise ValueError("coloring input is not accepted (only default or distinct)")
        
    validated["offset1"] = validateOffset(args, "offset1")
    validated["offset2"] = validateOffset(args, "offset2")
    validated["sequence"] = validateSequenceInput(args)
    validated["structure"] = validateStructureInput(args, validated)

    validated["output_name"], validated["output_type"] = validateOutput(args)

    validated["coloring"] = validateColoring(args)

    # TODO fix negative hybrid input 1. structre problem
    

    run(validated["structure"], validated["sequence"], validated["output_name"], 
        validated["output_type"], validated["coloring"], validated["offset1"], validated["offset2"])