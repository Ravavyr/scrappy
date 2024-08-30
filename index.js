const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const dns = require('dns').promises;

const sitelinks = new Set();
const externallinks = new Set();
const fileLinks = new Set();
let siteLinksCounter = 0;
let externalLinksCounter = 0;
let fileLinksCounter = 0;
const WRITE_THRESHOLD = 10;

(async () => {
    const [siteurl] = process.argv.slice(2);
    const [protocol, domain] = siteurl.split('://');

    if (protocol !== 'http' && protocol !== 'https') {
        console.log("Please pass in a full URL");
        return;
    }

    const sitedomain = domain.split('/')[0];

    // Clear files at the beginning of the run
    await Promise.all([
        fs.writeFile('data/files.txt', ''),
        fs.writeFile('data/dns.txt', ''),
        fs.writeFile('data/externallinks.txt', ''),
        fs.writeFile('data/sitelinks.txt', '')
    ]);

    if (sitedomain) {
        const recordTypes = ['A', 'AAAA', 'ANY', 'CNAME', 'MX', 'TXT', 'NS', 'NAPTR', 'PTR', 'SOA', 'SRV'];
        const dnsInfo = {};

        await Promise.all(recordTypes.map(async (type) => {
            try {
                const info = await dns.resolve(sitedomain, type);
                if (info.length) dnsInfo[type] = info;
            } catch (error) {
                // DNS record not found, ignore
            }
        }));

        await fs.writeFile('data/dns.txt', JSON.stringify(dnsInfo, null, 2));
        console.log("DNS data saved");
    }

    console.log("Starting Crawler");
    const startTime = Date.now();
    const browser = await puppeteer.launch({ headless: true, 'ignoreHTTPSErrors': true });

    async function writeToFile(filename, data) {
        let existingData;
        try {
            existingData = await fs.readFile(filename, 'utf8');
            if (!existingData.trim()) {
                existingData = '[]';
            }
        } catch (error) {
            existingData = '[]';
        }

        let existingSet;
        try {
            existingSet = new Set(JSON.parse(existingData));
        } catch (error) {
            console.error(`Error parsing JSON from ${filename}: ${error.message}`);
            existingSet = new Set();
        }

        const newSet = new Set([...existingSet, ...data]);
        await fs.writeFile(filename, JSON.stringify(Array.from(newSet), null, 2));
    }

    async function processUrl(pageurl) {
        if (sitelinks.has(pageurl)) return;
        sitelinks.add(pageurl);
        siteLinksCounter++;

        const fileExtensions = ['.pdf', '.docx', '.doc', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'];
        if (fileExtensions.some(ext => pageurl.toLowerCase().endsWith(ext))) {
            const response = await fetch(pageurl, { method: 'HEAD' });
            const size = response.headers.get('content-length') || 'unknown';
            fileLinks.add(`${pageurl},${size}`);
            fileLinksCounter++;

            if (fileLinksCounter >= WRITE_THRESHOLD) {
                await writeToFile('data/files.txt', fileLinks);
                fileLinks.clear();
                fileLinksCounter = 0;
            }
            return;
        }

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1');

        page.on('console', message => console.log(`${message.type().substring(0, 3).toUpperCase()} ${message.text()} --- ${pageurl}`))
            .on('pageerror', ({ message }) => console.log(`${message} --- ${pageurl}`))
            .on('requestfailed', request => {
                const failure = request.failure();
                const errorText = failure ? failure.errorText : 'Unknown error';
                console.log(`${errorText} ${request.url()}`);
            });

        try {
            const response = await page.goto(pageurl, {
                waitUntil: 'networkidle2'
            });
        } catch (error) {
            await fs.appendFile('data/error.txt', `Error processing ${pageurl}: ${error.message}\n`);
            await page.close();
            return;
        }
        await page.waitForSelector('title');

        const urls = await page.$$eval('a', as => as.map(a => a.href));

        const promises = urls.map(url => {
            if (!sitelinks.has(url) && url.startsWith(`${protocol}://${sitedomain}`)) {
                return processUrl(url.replace(/#$/, ""));
            } else if (!url.startsWith(`${protocol}://${sitedomain}`)) {
                externallinks.add(url);
                externalLinksCounter++;
            }
        });

        if (siteLinksCounter >= WRITE_THRESHOLD) {
            await writeToFile('data/sitelinks.txt', sitelinks);
            siteLinksCounter = 0;
        }

        if (externalLinksCounter >= WRITE_THRESHOLD) {
            await writeToFile('data/externallinks.txt', externallinks);
            externalLinksCounter = 0;
        }

        await Promise.all(promises.filter(Boolean));
        await page.close();
    }

    await processUrl(siteurl);

    // Write any remaining data
    if (siteLinksCounter > 0) {
        await writeToFile('data/sitelinks.txt', sitelinks);
    }
    if (externalLinksCounter > 0) {
        await writeToFile('data/externallinks.txt', externallinks);
    }
    if (fileLinksCounter > 0) {
        await writeToFile('data/files.txt', fileLinks);
    }

    console.log(`${sitelinks.size} Site Links saved`);
    console.log(`${externallinks.size} External Links saved`);

    await browser.close();
    console.log("Crawler End.");
    console.log(`Crawl Duration: ${(Date.now() - startTime) / 1000} seconds.`);
})();
