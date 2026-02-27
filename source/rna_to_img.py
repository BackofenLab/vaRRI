#!/usr/bin/python3
from pathlib import Path
import time
import argparse
from playwright.sync_api import sync_playwright
import urllib.parse
import os
import sys
import logging

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
working_dir = Path(os.getcwd())
# get the path to fornac.css and template_barebone.html
fornac_css = project_dir / "fornac" / "fornac.css"
template_barebone_html = project_dir / "example_html" / "template_barebone.html"
# set the path and create the name of the new file without the file type
path_rna_timestamp = working_dir / ("rna_" + str(time.time()))



# -----------------------------------------------------------------
# creating the template for the svg file:
svg_template = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"> \n' \
                '<style type="text/css">\n FORNAC_PLACEHOLDER \n</style>\n' \
                'SVG_PLACEHOLDER' \
                '\n</svg>'


try:
    assert (fornac_css).exists()
    with open(fornac_css, "r") as f:
    	svg_template = svg_template.replace("FORNAC_PLACEHOLDER", f.read()) 
except FileNotFoundError:
    logging.error("fornac.css was not found in project directory")


def buildMolecules(page, v):
    for var in ["structure", "sequence"]:
        assert var in v
    # complete structure and sequence with fix
    structure, sequence = v["structure"], v["sequence"]
    page.evaluate("""([structure, sequence]) => {
            var container = new fornac.FornaContainer("#rna_ss", {'animation': false});
            var options = {'structure': structure,
                        'sequence': sequence
            };
            container.addRNA(options.structure, options);
        }""", [structure, sequence])
    
# -----------------------------------------------------------------
def setupLogging(v: dict):
    assert "logging" in v
    # setup logging
    logging_option = logging.INFO if v["logging"] else logging.ERROR
    logging.basicConfig(level=logging_option,
                        format="[{levelname}] {message}",
                        style="{")

# -----------------------------------------------------------------
# open a headless chromium browser instance and load html file with
# FornaContainer. Extract the created svg into a seperated svg file
def run(v):
    with sync_playwright() as p:
        for var in ["molecules", "coloring", "highlighting", 
                    "output_name", "output_type"]:
            assert var in v

        file_name, file_type = v["output_name"], v["output_type"]
        # amount of molecules [1, 2]
        molecules = v["molecules"]
        # options [default, distinct]
        coloring_type = v["coloring"]
        # options [nothing, pairs, region]
        highlighting = v["highlighting"]


        # start browser and load page with fornac script
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        assert template_barebone_html.exists()
        page.goto("file:///" + str(template_barebone_html))
        
        # use fornac to generate structure
        buildMolecules(page, v)

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

        #  extracting the built svg file
        svg = page.locator("svg").first.inner_html()

        # adding the svg code into svg file template
        final_svg = svg_template.replace("SVG_PLACEHOLDER", svg)

        # finalise file name
        if file_name == "default":
            complete_path = working_dir / ("rna_" + str(time.time()) + "." + file_type)
        else:
            complete_path = working_dir / (file_name + "." + file_type)

        error = ""

        if file_name == "STDOUT":
            print(final_svg)
        else:
            try:
                if file_type == "png":
                    # create a new page with the svg code and take a screenshot
                    svg_page = browser.new_page()
                    url_svg = urllib.parse.quote(final_svg)
                    svg_page.goto(f"data:image/svg+xml,{url_svg}")
                    svg_page.screenshot(path=complete_path)
                    
                    logging.info(f"png File created: {complete_path}")
                if file_type == "svg":
                    # writing the svg code as a string into a file
                    with open(complete_path, "w") as f:
                        f.write(final_svg)
                    logging.info(f"svg File created: {complete_path}")

            except PermissionError:
                error = "Permission Denied for Path: "
            except ValueError:
                error = "Pfad ist ungültig: "
            except FileNotFoundError:
                error = "Path does not exist: "

        if error:
            print("[Error] " + error + str(complete_path))
            sys.exit(2)

        # close chromium borwser
        browser.close()

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
			help='give the output picture a name and a file type. \n' \
            'Supported are svg and png. Default is svg',
            default='STDOUT')
    parser.add_argument(
            '-c',
			'--coloring',
			help='how should the nucleotides be colored? \n' \
            'default: default coloring fornac \n' \
            'distinct: each sequence gets its own color',
            default='default')
    parser.add_argument(
            '-H',
			'--highlighting',
			help='what should be highlighted? \n' \
            'nothing: default fornac, no special higlighting \n' \
            'basepairs: each intermolecular basepair base, gets a red cricle \n' \
            'regions: every base inside the intermolecular region, ' \
            'starting with the first intermolecular basepair and ending with the last,' \
            'gets a red circle',
            default='region')
    parser.add_argument(
            '-i1',
			'--startIndex1',
			help='with what index should the indexing of the first sequence start? \n' \
            '0 is no option \n' \
            'default: 1',
            default="1")
    parser.add_argument(
            '-i2',
			'--startIndex2',
			help='with what index should the indexing of the second sequence start if there is one? \n' \
            '0 is no option \n' \
            'default: 1',
            default="1")
    parser.add_argument(
            '-v',
			'--verbose',
			help='Enable Logging',
            action='store_true')    
    #-------------------------------------------------------------------------------
    # input validation

    # dictionary of all input variables
    args = vars(parser.parse_args())
    # dictionary of all validated input variables
    validated = {}

    try:
        # setup logging if enabled
        validated["logging"] = args["verbose"]
        setupLogging(validated)

        validated["offset1"] = validateOffset(args, "startIndex1")
        validated["offset2"] = validateOffset(args, "startIndex2")
        validated["sequence"] = validateSequenceInput(args)
        validated["structure"] = validateStructureInput(args, validated)

        # if an interaction between 2 Molecules is given, fornac does not display 
        # the first 2 nucelotides of the second molecule. 
        # in the variables "structure" and "sequence" a fix has been added

        # but "structure1" and "structure2" are data only and do not have the fix
        validated["structure1"], validated["structure2"], validated["structure"] = formatStructure(validated)
        # "sequence1" and "sequence2" are data only as well
        validated["sequence1"], validated["sequence2"], validated["sequence"] = formatSequence(validated)

        validated["output_name"], validated["output_type"] = validateOutput(args)

        validated["coloring"] = validateColoring(args)

        validated["molecules"] = getMolecules(validated)

        validated["highlighting"] = validateHighlighting(args)


    except ValueError as e:
        logging.error(e)
        sys.exit(2)

    run(validated)