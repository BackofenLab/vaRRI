const puppeteer = require('puppeteer');
const fs = require('node:fs');

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
// FornaContainer. Ectract the created svg into a seperated svg file
async function run() {
   try {
        // puppeteer init, start chromium browser
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // loading the html
        await page.goto('file:////home/fabi/BachelorProjekt/vaRRI/example_html/working_index_2.html');
        // extracting the built svg file
        const svg = await page.$eval("svg", (element)=> element.innerHTML)
        // combining all svg file elements in one string
        var final_svg = svg_header + svg_style + svg + svg_footer;

        // writing the string into a file
        fs.writeFile('test.svg', final_svg, 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('File written successfully!');
        });

        // close chromium borwser
        await browser.close();
    } catch (err) {
        console.log("Error: " + err)
    }
}

run();