const puppeteer = require('puppeteer');

(async()=> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('file:////home/fabi/BachelorProjekt/vaRRI/example_html/working_index.html');

    page.setViewport({ width: 300, height: 300 })
    await page.screenshot({ path: `screenshot${Date.now()}.png` });

    await browser.close();
})();