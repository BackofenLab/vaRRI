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


# -----------------------------------------------------------------
# open a headless chromium browser instance and load html file with
# FornaContainer. Extract the created svg into a seperated svg file
def run(structure, sequence, file_name, file_type, coloring_type="default", offset_1 = 0, offset_2 = 0):
    try:
        with sync_playwright() as p:
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
            first_seq = sequence.split("&")[0]
            second_seq = sequence.split("&")[1] if "&" in sequence else ""
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
            # changing the indexing
            indexing = []
            # index for the first sequence
            indexing = [str(i) for i in range(10 + offset_1, len(first_seq)+1+offset_1, 10)]
            # indexing for the second sequence
            first_index = 8 - (len(first_seq) % 10) + offset_2
            indexing += [str(i) for i in range(first_index, len(second_seq)+1+offset_2, 10)]

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
			'--offset_first',
			help='with what offset should the indexing of the first sequence start?' \
            'default: 0',
            default="0")
    parser.add_argument(
			'--offset_second',
			help='with what offset should the indexing of the second sequence start if ther is one?' \
            'default: 0',
            default="0")
    args = parser.parse_args()

    output_file = args.output

    if "." not in output_file:
        output_file += ".svg"
    # split output file name into the name and the file type
    output_file_name = "".join(output_file.split(".")[:-1])
    output_file_type = output_file.split(".")[-1]
 
    sequence = args.sequence
    structure = args.structure

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
    if (not args.offset_first.isdigit()) or (not args.offset_second.isdigit()):
        raise Exception("index starting positions must be a number of type integer")
    offset_1 = int(args.offset_first)
    offset_2 = int(args.offset_second)

    # assert that there are as many "(" as ")"
    if structure.count("(") != structure.count(")"):
        raise Exception("the structure is invalid. The number of ( and ) must be the same")  


    run(structure, sequence, output_file_name, output_file_type, args.coloring_mode, offset_1, offset_2)