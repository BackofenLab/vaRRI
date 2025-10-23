var fs = require('fs');
var page = require('webpage').create();

var relativePath = 'example_html_with_path/working_index.html';
var absolutePath = fs.absolute(relativePath);
console.log('Absoluter Pfad:', absolutePath);

if (fs.exists(absolutePath)) {
  console.log('Datei wurde gefunden!');
} else {
  console.log('Datei wurde nicht gefunden.');
}
absolutePath = 'file:///' + absolutePath;


page.open(absolutePath, function() {
  console.log("-------------------------------");
  window.setTimeout(function () {
        page.render('working_index.png');
        console.log(page.content);
        phantom.exit();
        }, 1000);
});
