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

def transformHybridDB(hybrid_input: str, sequence: str):
    # takes input of form: 6|||..&3|||.. and returns a sctructure string
    # TODO explain what im doing here
    # or TODO remake 
    seq_1, seq_2 = sequence.split("&")
    hyb_1, hyb_2 = hybrid_input.split("&")
    index_1, index_2 = int(hyb_1[0]), int(hyb_2[0])
    inter_1, inter_2 = hyb_1[1:], hyb_2[1:] 
    struc_1 = "."*index_1 + inter_1 + "." * int(len(seq_1)-index_1-len(inter_1))
    struc_2 = "." * index_2 + inter_2 + "." * int(len(seq_2)-index_2 - len(inter_2))
    return struc_1.replace("|","(") + "&" + struc_2.replace("|",")")

    #structure = ["&" if i == "&" else "." for i in sequence]





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
			'structure',
			help='structure of the rna, in dot-bracket notation')
    parser.add_argument(
			'sequence',
			help='sequence of the rna, out of the letters C,G,U and A')
    parser.add_argument(
            '-o',
			'--output',
			help='give the output picture a name and a file type. ' \
            'Supported are svg and png. Default is svg',
            default='default.svg')
    parser.add_argument(
            '-c',
			'--coloring_mode',
			help='how should the nucleotides be colored?' \
            'default: default coloring fornac' \
            'distinct: each sequence gets its own color',
            default='default')
    parser.add_argument(
			'--offset_1',
			help='with what offset should the indexing of the first sequence start?' \
            'default: 0',
            default="0")
    parser.add_argument(
			'--offset_2',
			help='with what offset should the indexing of the second sequence start if ther is one?' \
            'default: 0',
            default="0")
    parser.add_argument(
			'--hybridDB',
			help='additional version of inputing structure:  hybridDB="16||||||&9||||||"' \
            'default: False',
            default=False)
    args = parser.parse_args()

 
    sequence = args.sequence
    structure = args.structure
    hybrid = args.hybridDB
    # TODO assert structure is ""
    if hybrid != False:
        # TODO make sure hybrid input is valid
        # TODO transform hybriddb into a structure
        structure = transformHybridDB(hybrid, sequence)
        print(structure)

    # TODO assert structure and sequence is given


    output_file = args.output

    if "." not in output_file:
        output_file += ".svg"
    # split output file name into the name and the file type
    output_file_name = "".join(output_file.split(".")[:-1])
    output_file_type = output_file.split(".")[-1]


    # assert that the output specifies a valid file type
    if not (output_file_type == "svg" or output_file_type == "png"):
        raise Exception("the specified file type is not accepted (only svg and png)")
    # assert that the output specifies a name and a type
    if (output_file_name == "" or output_file_type == ""):
        raise Exception("the specified output name is not valid")
    
    if args.structure is None or args.sequence is None or args.structure == "" or args.sequence == "":
        raise Exception("Error: a rna structure and sequence is needed")
    
    if len(args.structure) != len(args.sequence):
        raise Exception("structure and sequence have differnt lengths")
    if not (args.coloring_mode == "default" or args.coloring_mode == "distinct"):
        raise Exception("coloring_mode is not accepted (only default and distinct)")
    if (not validNumber(args.offset_1)) or (not validNumber(args.offset_1)):
        raise Exception("index starting positions must be a number of type integer")
    offset_1 = int(args.offset_1)
    offset_2 = int(args.offset_2)

    # assert that there are as many "(" as ")"
    if structure.count("(") != structure.count(")"):
        raise Exception("the structure is invalid. The number of ( and ) must be the same")  
    

    run(structure, sequence, output_file_name, output_file_type, args.coloring_mode, offset_1, offset_2)