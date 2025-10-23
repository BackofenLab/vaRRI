var fs = require('fs');
var page = require('webpage').create();


var relativePath = './phantomjs_index.html';
var absolutePath = fs.absolute(relativePath);

console.log('Absoluter Pfad:', absolutePath);
absolutePath = 'file:///' + absolutePath;

page.open(absolutePath, function() {
  console.log("-------------------------------");
  window.setTimeout(function () {
        page.render('phantomjs_index.png');
        console.log(page.content);
        phantom.exit();
        }, 1000);
  });
