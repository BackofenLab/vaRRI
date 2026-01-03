from pathlib import Path
import time
import argparse
# playwright version: pytest-playwright-0.7.2
from playwright.sync_api import sync_playwright
import urllib.parse
import re
import traceback

# import input validation functions:
from input_validation import validateStructureInput, validateSequenceInput, validateOffset, validateOutput, validateColoring

# -----------------------------------------------------------------
project_dir = Path(__file__).resolve().parent.parent.absolute()
working_dir = Path(__file__).resolve().parent.absolute()
# get the path to fornac.css and template_barebone.html
fornac_css = project_dir / "fornac" / "fornac.css"
template_barebone_html = project_dir / "example_html" / "template_barebone.html"
# set the path and create the name of the new file without the file type
path_rna_timestamp = working_dir / ("rna_" + str(time.time()))

# -----------------------------------------------------------------
# TODO set String with placeholder instead of puzzle together
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





# -----------------------------------------------------------------
# open a headless chromium browser instance and load html file with
# FornaContainer. Extract the created svg into a seperated svg file
def run(structure, sequence, file_name, file_type, coloring_type="default", offset_1 = 0, offset_2 = 0):
    try:
        with sync_playwright() as p:

            # fix fornac Error: incorrectly cutting of the first 2 nodes in the second sequence
            # HACK gegebenenfalls fixen wenn fornac updated
            structure = structure.replace("&", "&..")
            sequence = sequence.replace("&", "&ee")

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
			
			# use fornac to generate structure
            page.evaluate("""([structure, sequence]) => {
					var container = new fornac.FornaContainer("#rna_ss", {'animation': false});
					var options = {'structure': structure,
								'sequence': sequence
					};
					container.addRNA(options.structure, options);
				}""", [structure, sequence])

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
            '''
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
                '''    
            # --------------------------------------------------------
            # TODO make circle edge red, between first and last basepair in first sequence and in seconde
            # assert "(" in first_struc
            # assert "(" in second_struc
            # TODO only do this given 2 structures and the right option enabled!
            # TODO not all basepairs are interbasepairs. first exclude all intrabasepairs

            basepair_region = []
            assert second_seq != "" and second_struc != ""
            for structure in [first_struc, second_struc]:
                basepair_list = listIntermolPairs(structure)
                assert basepair_list
                # fornac starts counting nodes with 1 -> list index start with 0
                region = (basepair_list[0]+1, basepair_list[-1]+1)
                basepair_region += [region]

            # transform from local indexing to fornac indexing
            local_1, local_2 = basepair_region[1]
            offset = len(first_struc)
            basepair_region[1] = (local_1 + offset, local_2 + offset)
                

            print(f"basepairregions: {basepair_region}")

            page.evaluate("""(basepair_region) => {
                    for (const [start, final] of basepair_region){
                        for (let index = start; index <= final; index++) {
                            node = document.querySelector('circle[node_num="' + index.toString() + '"]'); 
                            style = node.getAttribute("style");
                            node.setAttribute("style", style + "stroke: red;");          
                          }
                    }
				}""", basepair_region)      



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
        

def listIntermolPairs(struc):
    '''
    takes a structure and returns a list of indicies 
    where intermolecular basepairs are, given no pseudoknots

    in the first sequence:
    if a bracket doesnt close it is a intermol bracket
    we just return the list of not closed brackets

    in the second sequence:
    if a brackets closes, but there are no opened brackets,
    it also must be a 


    eg (())...((...(())&(())...))...(())
    eg ((..(..))&((..)..))
       ^                 ^
    '''
    inter_basepairs = []
    basepairs = []
    for index, char in enumerate(struc):
        if char == "(":
            basepairs += [index]
        if char == ")":
            if basepairs:
                basepairs.pop()
            else:
                inter_basepairs += [index]
    
    return inter_basepairs if not basepairs else basepairs



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


    validated["offset1"] = validateOffset(args, "offset1")
    validated["offset2"] = validateOffset(args, "offset2")
    validated["sequence"] = validateSequenceInput(args)
    validated["structure"] = validateStructureInput(args, validated)

    validated["output_name"], validated["output_type"] = validateOutput(args)

    validated["coloring"] = validateColoring(args)

    # TODO fix negative hybrid input 1. structre problem
    

    run(validated["structure"], validated["sequence"], validated["output_name"], 
        validated["output_type"], validated["coloring"], validated["offset1"], validated["offset2"])