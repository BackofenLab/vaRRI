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
# set the path and create the name of the new svg file
rna_timestamp_svg = working_dir / ("rna_" + str(time.time()) + ".svg")
rna_timestamp_png = working_dir / ("rna_" + str(time.time()) + ".png")


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
def run(structure, sequence, file_type, coloring_type="default"):
    try:
        with sync_playwright() as p:
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

#
            coloring = []
            # this option colors all nucleotides of one sequence in one color
            if coloring_type == "distinct":
                first_seq = sequence.split("&")[0]
                second_seq = sequence.split("&")[1] if "&" in sequence else ""
                coloring = sequence_coloring(first_seq, second_seq)
            
            # color all circles with the given color in the coloring list
            page.evaluate("""(coloring) => {
                    function coloringTheCircles(coloring) {
                        if (coloring.length == 0) {return;}
                        var list_of_nodes = document.getElementsByClassName("fornac-node");
                        for (const [index, node] of Object.entries(list_of_nodes)){
                            if (node.getAttribute("r") == "5"){
                            if (coloring.length < index) {
                            document.getElementById("debug").innerHTML += 
                            'index out of color array bounds: ' + index.toString() + '|';
                            continue;
                            }
                            node.setAttribute("style", "fill: " + coloring[index] + ";");
                            }    
                        }
                    }
                    coloringTheCircles(coloring)
				}""", coloring)          
             
            # debugging:
            debug_text = page.locator("div").first.inner_html()
            print(debug_text)


			#  extracting the built svg file
            svg = page.locator("svg").first.inner_html()
            # combining all svg file elements in one string
            final_svg = svg_header + svg_style + svg + svg_footer
                        
			# svg und png funktionieren auch ohne?
            # final_svg = re.sub('<title>empty:[0-9]{1,2}</title>', '', final_svg)

            
            if file_type == "png":
                # create a new page with the svg code and take a screenshot
                svg_page = browser.new_page()
                url_svg = urllib.parse.quote(final_svg)
                svg_page.goto(f"data:image/svg+xml,{url_svg}")
                svg_page.screenshot(path=rna_timestamp_png)
            if file_type == "svg":
    			# writing the svg code as a string into a file
                with open(rna_timestamp_svg, "w") as f:
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
			'-file_type',
			help='decide if the picture should be a png or svg',
            default='svg')
    parser.add_argument(
			'-coloring_type',
			help='how should the nucleotides be colored?' \
            'default: default coloring fornac' \
            'distinct: each sequence gets its own color',
            default='default')
    args = parser.parse_args()
    
    if args.structure is None or args.sequence is None:
        print("Error: a rna structure and sequence is needed")
        exit()
    
    if len(args.structure) != len(args.sequence):
        raise Exception("structure and sequence have differnt lengths")
    if not (args.file_type == "svg" or args.file_type == "png"):
        raise Exception("file_type is not accepted (only svg and png)")
    if not (args.coloring_type == "default" or args.coloring_type == "distinct"):
        raise Exception("coloring_type is not accepted (only default and distinct)")
    run(args.structure, args.sequence, args.file_type, args.coloring_type)