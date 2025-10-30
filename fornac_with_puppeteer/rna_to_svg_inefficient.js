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
        // get html template
        if (!fs.existsSync('template.html')) {throw "Template file not found"}
        html_template = await fs.promises.readFile('template.html', 'utf8');
        console.log("read template.html");

        // add the sequence and the structure
        var html_add_struc = (await html_template).replace("%%STRUCTURE%%", structure);
        var html_page = (await html_add_struc).replace('%%SEQUENCE%%', sequence);

        // create a new temporary html file, with the given seq and struc
        await fs.promises.writeFile('temp.html', html_page);
        console.log("temp.html created");

        // puppeteer init, start chromium browser
        const browser = await puppeteer.launch();
        const page = await browser.newPage();


        await page.goto('file:////home/fabi/BachelorProjekt/vaRRI/fornac_with_puppeteer/temp.html');

        // extracting the built svg file
        const svg = await page.$eval("svg", (element)=> element.innerHTML)
        // combining all svg file elements in one string
        var final_svg = svg_header + svg_style + svg + svg_footer;

        // writing the string into a file
        await fs.promises.writeFile('test.svg', final_svg, 'utf8');
        console.log("test.svg created");

        // deleting the temporary html file
        fs.unlink('temp.html', (err) => {
          if (err) throw err;
          console.log('temp.html was deleted');
        });

        // close chromium borwser
        await browser.close();
    } catch (err) {
        console.log("Error: " + err);
        return;
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
