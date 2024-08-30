/*const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const puppeteer = require('puppeteer');
const fs = require('fs');
const fsPromises = require('fs').promises;
const moviepages = require('./moviespages.json');

/*global links variables *
const movielinks = new Set();

(async () => {

    /*Begin Crawler*
    console.log("Starting Crawler");
    const starttime = new Date();
    const browser = await puppeteer.launch({ headless: true, 'ignoreHTTPSErrors': true });



    async function process_url() {

        for(let i=0; i<moviepages.length; i++){
            // Instructs the blank page to navigate a URL
            let page = await browser.newPage();
            //set user agent
            await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1');
            await page.goto(moviepages[i].link, { waitUntil: 'networkidle2' });

            //await page.pdf({ path: 'overview.pdf' }); /*saves pdf of page*

            // Get page title
            await page.waitForSelector('title');
            const title = await page.title();

            //console.log(`The title is: ${title}`);
            let movielink = await page.evaluate(`document.querySelector('a[href^="/movie.php"]').getAttribute("href")`);
            let movietitle = await page.evaluate(() => {
                let el = document.querySelector(".field-name-title h2")
                return el ? el.innerText : ""
            });
            let movieyear = await page.evaluate(() => {
                let el = document.querySelector(".date-display-single")
                return el ? el.innerText : ""
            });
            movielinks.add({'link':movielink,'title':movietitle,'year':movieyear});
            console.log(i+"...");
        }

    }

    await process_url();

    await fs.writeFile('data/movies.txt', JSON.stringify(Array.from(movielinks), null, 2), err => {
        if (err) {
            console.error(err);
            return
        }
        console.log(movielinks.size+" Movies saved");
    });

    browser.close();
    console.log("Crawler End.");
    const endtime = new Date();
    console.log("Crawl Duration: " + ((endtime - starttime) / 1000) + " seconds.");
})();
*/