from pathlib import Path
import time
import argparse
from playwright.sync_api import sync_playwright


# -----------------------------------------------------------------
project_dir = Path(__file__).resolve().parent.parent.absolute()
working_dir = Path(__file__).resolve().parent.absolute()
# get the path to fornac.css and template_barebone.html
fornac_css = project_dir / "fornac" / "fornac.css"
template_barebone_html = project_dir / "example_html" / "template_barebone.html"
# set the path and create the name of the new svg file
rna_timestamp_svg = working_dir / ("rna_" + str(time.time()) + ".svg")


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


# -----------------------------------------------------------------
# open a headless chromium browser instance and load html file with
# FornaContainer. Extract the created svg into a seperated svg file
def run(structure, sequence):
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
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
            
			# when making screenshot the text wount display: figuring out the reason
            # page.evaluate("""() => {document.getElementsByTagName("text")[0].innerHTML="newtext"}""")
            page.locator("svg").first.screenshot(path="screenshot.png")


            #page.screenshot(path="screenshot.png")
            print(page.content())

			#  extracting the built svg file
            svg = page.locator("svg").first.inner_html()
            # combining all svg file elements in one string
            final_svg = svg_header + svg_style + svg + svg_footer
            
            
			# writing the string into a file
            with open(rna_timestamp_svg, "w") as f:
                f.write(final_svg)
            
			# close chromium borwser
            browser.close()
    except Exception as e:
        print(f"Error found: {e}", e)
        


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
			'pthon3.10 rna_to_svg.py -struc "((..((....)).(((....))).))" - seq CGCUUCAUAUAAUCCUAAUGACCUAU')
	parser.add_argument(
			'structure',
			help='structure of the rna, in dot-bracket notation')
	parser.add_argument(
			'sequence',
			help='sequence of the rna, out of the letters C,G,U and A')
    
	args = parser.parse_args()
    
	if args.structure is None or args.sequence is None:
		print("Error: a rna structure and sequence is needed")
		exit()
    
	run(args.structure, args.sequence)