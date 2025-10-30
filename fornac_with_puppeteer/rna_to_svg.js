const puppeteer = require('puppeteer');
const fs = require('node:fs');
const { argv } = require('node:process');

// -----------------------------------------------------------------
// creating the elemnts for the svg file:
const svg_header = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"> \n'
const svg_footer = '\n</svg>'
var svg_style = ''
fs.readFile('../fornac/fornac.css', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  svg_style = '<style type="text/css">\n' + data + '\n</style>\n';
});

// -----------------------------------------------------------------
// open a headless chromium browser instance and load html file with
// FornaContainer. Extract the created svg into a seperated svg file
async function run(structure, sequence) {
   try {
        // puppeteer init, start chromium browser
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto('file:////home/fabi/BachelorProjekt/vaRRI/fornac_with_puppeteer/template_barebone.html');
        
        // use fornac to generate structure
        await page.evaluate((structure, sequence) => {
              var container = new fornac.FornaContainer("#rna_ss", {'animation': false});
              var options = {'structure': structure,
                        'sequence': sequence
              };
              container.addRNA(options.structure, options);
        }, structure, sequence);


        // extracting the built svg file
        const svg = await page.$eval("svg", (element)=> element.innerHTML)
        // combining all svg file elements in one string
        var final_svg = svg_header + svg_style + svg + svg_footer;

        // writing the string into a file
        await fs.promises.writeFile('test.svg', final_svg, 'utf8');
        console.log("test.svg created");

        // close chromium borwser
        await browser.close();
    } catch (err) {
        console.log("Error: " + err);
        return null;
    }
}

// -----------------------------------------------------------------
// Input parameters for script: 
// (needs 2 input parameter: structure and sequence)
if (process.argv[2] || process.argv[3]) {
  run(process.argv[2], process.argv[3]);
} else {
  console.log("Error: structure and/or sequence not given\n" +
    'example: node rna_to_svg_inefficient.js "((..((....)).(((....))).))" CGCUUCAUAUAAUCCUAAUGACCUAU');
}
