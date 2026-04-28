#!/usr/bin/python3
from pathlib import Path
import time
import argparse
from playwright.sync_api import sync_playwright
import urllib.parse
import os
import sys
import logging
import traceback

# import input validation functions:
from input_validation import (croppingInput,
                              validateCropping,
                              validate)

from modifications import (changeBackgroundColor,
                           highlightingRegion,
                           highlightingBasepairs,
                           visualiseBasepairStength,
                           removeSecondLink,
                           highlightSubsequence,
                           removeDummyNodes,
                           setLinksId,
                           updateLinkTooltips,
                           setLabelsId,
                           updateNodeToolTips,
                           setIndexLabels,
                           backgroundhighlightingBasepairs,
                           backgroundhighlightingRegion,
                           showAccessibility
                           )
# -----------------------------------------------------------------
project_dir = Path(__file__).resolve().parent.parent.absolute()
working_dir = Path(os.getcwd())
# get the path to fornac.css and template_barebone.html
fornac_css = project_dir / "fornac" / "fornac.css"
template_barebone_html = project_dir / "example_html" / "template_barebone.html"
example_fasta = project_dir / "test" / "example.fasta"
dot_ps = working_dir / "dot.ps"
plfold_lunp = working_dir / "plfold_lunp"
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
    for var in ["structure", "sequence", "labelInterval"]:
        assert var in v
    # complete structure and sequence with fix
    structure, sequence, interval = v["structure"], v["sequence"], v["labelInterval"]

    page.evaluate("""([structure, sequence, interval]) => {
            var container = new fornac.FornaContainer("#rna_ss", {'animation': false, 'labelInterval': 1});
            var options = {'structure': structure,
                        'sequence': sequence
            };
            container.addRNA(options.structure, options);
        }""", [structure, sequence, interval])
    
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
                    "output_name", "output_type", "sequence",
                    "backgroundhighlighting"]:
            assert var in v

        file_name, file_type = v["output_name"], v["output_type"]
        # amount of molecules [1, 2]
        molecules = v["molecules"]
        # options [default, distinct]
        coloring_type = v["coloring"]
        # options [nothing, pairs, region]
        highlighting = v["highlighting"]
        # option [(int,int)]
        subsequence1 =  v["highlightSubseq1"]
        subsequence2 =  v["highlightSubseq2"]
        # seq1&...seq2
        seq = v["sequence"]
        # options [nothing, pairs, region]
        backgroundhighlighting = v["backgroundhighlighting"]
        # options [True, False]
        showAccessibility1 = v["accessibility1"]
        showAccessibility2 = v["accessibility2"]

        


        # start browser and load page with fornac script
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        assert template_barebone_html.exists()
        page.goto("file:///" + str(template_barebone_html))
        
        # use fornac to generate structure
        buildMolecules(page, v)

    
        # -------------------------------------------------------------
        # preparing the svg for modification:
        # set Id for Links and labels for direct access
        setLinksId(page)
        setLabelsId(page)
        # remove dummy nodes that make up the seperating space
        # between the 2 molecules
        removeDummyNodes(page, seq)
        # remove the second layer of intermolecular links
        # now: only links from node1 to node2 where node1 < node2
        if molecules == "2":
            removeSecondLink(page)


        # -----------------------------------------------------
        # changing the background color
        # this option colors all nucleotides of one sequence in one color
        if coloring_type == "strand":
            changeBackgroundColor(page, v)

        # -----------------------------------------------------
        # displaying the correct Numbers:

        # changing the tooltip number of each node 
        updateNodeToolTips(page, v)
        # changing the tooltip for each link
        updateLinkTooltips(page, v)
        # and set the correct index labels
        setIndexLabels(page, v)

        # -----------------------------------------------------
        # changing the higlighting of nodes to show
        # intermolecular setting
        # only works when 2 molecules given
        if molecules == "2":
            if highlighting == "region":
                highlightingRegion(page, v)
            if highlighting == "basepairs":
                highlightingBasepairs(page, v)
        
        # -----------------------------------------------------
        # changing the backgroundhighlighting of nodes to show
        # intermolecular setting
        # only works when 2 molecules given
        if molecules == "2":
            if backgroundhighlighting == "region":
                backgroundhighlightingRegion(page, v)
            if backgroundhighlighting == "basepairs":
                backgroundhighlightingBasepairs(page, v)

        #-----------------------------------------------
        # visualise basepair strenght (G-U )
        if not v["guBasepairs"]:
            visualiseBasepairStength(page, v)

        #------------------------------------------------
        # highlight subsequence
        if subsequence1 is not None:
            highlightSubsequence(page, v, "1")
        if molecules == "2" and subsequence2 is not None:
            highlightSubsequence(page, v, "2")

        #------------------------------------------------
        # show accessibility of Nucleotides  
        if showAccessibility1 != "None" or showAccessibility2 != "None":
            showAccessibility(v, plfold_lunp, page)

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
                error = "Path is invalid: "
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
            'loop: default coloring fornac \n' \
            'strand: each sequence gets its own color',
            default='strand')
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
            '-l',
			'--labelInterval',
			help='set the Intervall in which a label shows the index, default: 10',
            default='10')
    parser.add_argument(
			'--crop1',
			help='crop first molecules on both sides: ' \
                'visualising nt nodes ' \
                'before the start and after the end of the intermolecular Region  ',
            default='None')   
    parser.add_argument(
			'--crop2',
			help='crop second molecules on both sides: ' \
                'visualising nt nodes ' \
                'before the start and after the end of the intermolecular Region  ',
            default='None')
    parser.add_argument(
			'--crop',
			help='crop both molecules on both sides: ' \
                'visualising nt nodes ' \
                'before the start and after the end of the intermolecular Region  ',
            default='None')
    parser.add_argument(
			'--highlightSubseq1',
			help='highlight a subsequence of the first sequence',
            default='None')
    parser.add_argument(
			'--highlightSubseq2',
			help='highlight a subsequence of the second sequnec',
            default='None')    
    parser.add_argument(
			'--guBasepairs',
			help='disabble visualising all G-U basepairs with a dashed line',
            action='store_false')    
    parser.add_argument(
            '-bH',
			'--backgroundhighlighting',
			help='what should have a backgroundhighlight? \n' \
            'nothing: default fornac, no special backgroundhighlighting \n' \
            'basepairs: each intermolecular basepair stacking, gets a red background (default) \n' \
            'regions: the whole intermolecular region gets a red background, ' \
            'starting with the first intermolecular basepair and ending with the last,',
            default='basepairs')
    parser.add_argument(
			'--fastafile',
			help='path to FASTA file, containing one or two sequences',
            default="None")
    parser.add_argument(
			'--structurePrediction',
			help='enable structure prediction if only a sequence is given. Either True or False. Default False',
            action='store_true')
    parser.add_argument(
			'--accessibility1',
			help='Visualising Node accessibility in sequence 1 \n'\
            'according to a given lunp file containing according porbabilities. \n'\
            'Options are [path/to/lunpfile, empty String, None] \n'\
            'path/to/lunpfile uses the data in this file to get probabilities and visualise \n'\
            '"RNAplfold" String uses the RNAplfold to predict probabilities and visualise \n'\
            'None (default) does not visualise Accessibility',
            default="None")
    parser.add_argument(
			'--accessibility2',
			help='Visualising Node accessibility in sequence 2 \n'\
            'according to a given lunp file containing according porbabilities. \n'\
            'Options are [path/to/lunpfile, empty String, None] \n'\
            'path/to/lunpfile uses the data in this file to get probabilities and visualise \n'\
            '"RNAplfold" String uses the RNAplfold to predict probabilities and visualise \n'\
            'None (default)" does not visualise Accessibility',
            default="None")
    parser.add_argument(
			'--RNAfold',
			help='add parameters to RNAfold call. Default ""\n' \
            'example RNAfold call:\n' \
            'RNAfold --noPS -C << EOF\AAAAAAAACCCCAAAAGGGGGGGGAAACCCC\..................................\nEOF',
            default="")
    parser.add_argument(
			'--RNAplfold',
			help='add parameters to RNAplfold call. Default ""\n' \
            'example RNAplfold call:\n' \
            'echo AAAAAAAAGGGGAAAACCCCAAAAAAGGGGGGGG | RNAplfold -W20 -u1',
            default="")    
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
        logging.info("logging activated")

        validated.update(validate(args))

        validated.update(croppingInput(validated, args))
        logging.info("input validation completed")


    except ValueError as e:
        logging.error(e)
        #traceback.print_exc()
        sys.exit(2)

    run(validated)
