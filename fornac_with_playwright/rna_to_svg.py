from pathlib import Path
import time
import argparse
# playwright version: pytest-playwright-0.7.2
from playwright.sync_api import sync_playwright
import urllib.parse
import re
import traceback

# import input validation functions:
from input_validation import (validateStructureInput, 
                              validateSequenceInput, 
                              validateOffset, 
                              validateOutput, 
                              validateColoring, 
                              formatStructure,
                              formatSequence,
                              getMolecules,
                              validateHighlighting)

from modifications import (changeBackgroundColor,
                           updateIndexing,
                           highlightingRegions,
                           highlightingBasepairs,
                           )
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


# -----------------------------------------------------------------
# open a headless chromium browser instance and load html file with
# FornaContainer. Extract the created svg into a seperated svg file
def run(v):
    try:
        with sync_playwright() as p:
            # complete structure and sequence with fix
            structure, sequence = v["structure"], v["sequence"]

            file_name, file_type, coloring_type = v["output_name"], v["output_type"], v["coloring"]

            # amount of molecules either 1 or 2
            molecules = v["molecules"]

            # options [nothing, pairs, region]
            highlighting = v["highlighting"]


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
            # this option colors all nucleotides of one sequence in one color
            if coloring_type == "distinct":
                changeBackgroundColor(page, v)


            # -----------------------------------------------------
            # changing the indexing number of each node and the index markers
            updateIndexing(page, v)


            # -----------------------------------------------------
            # changing the higlighting of different molecules in a intermolecular setting
            # only works when 2 molecules given
            if molecules == "2":
                if highlighting == "region":
                    highlightingRegions(page, v)
                if highlighting == "basepairs":
                    highlightingBasepairs(page, v)


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
            '-i',
			'--highlighting',
			help='what should be highlighted?' \
            'nothing: default fornac, no special higlighting' \
            'basepairs: each intermolecular basepair base, gets a red cricle' \
            'regions: every base inside the intermolecular region, ' \
            'starting with the first intermolecular basepair and ending with the last,' \
            'gets a red circle',
            default='region')
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
    # dictionary of all input variables
    args = vars(parser.parse_args())
    # dictionary of all validated input variables
    validated = {}


    validated["offset1"] = validateOffset(args, "offset1")
    validated["offset2"] = validateOffset(args, "offset2")
    validated["sequence"] = validateSequenceInput(args)
    validated["structure"] = validateStructureInput(args, validated)

    # structure and sequence have the fix and can be used with fornac, 
    # structure1 and structure2 are data only 
    validated["structure1"], validated["structure2"], validated["structure"] = formatStructure(validated)
    # sequence1 and sequence2 are data only
    validated["sequence1"], validated["sequence2"], validated["sequence"] = formatSequence(validated)

    validated["output_name"], validated["output_type"] = validateOutput(args)

    validated["coloring"] = validateColoring(args)

    validated["molecules"] = getMolecules(validated)

    validated["highlighting"] = validateHighlighting(args)

    # TODO fix negative hybrid input 1. structre problem
    
    for key in ["structure", "sequence", "molecules",
                "structure1", "structure2", "sequence1", "sequence2",
                "output_name", "output_type", "coloring", "highlighting",
                "offset1", "offset2"]:
        assert key in validated

    run(validated)