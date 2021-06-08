const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const puppeteer = require('puppeteer');
const fs = require('fs');
const fsPromises = require('fs').promises;

(async () => {

    const args = process.argv.slice(2);
    const siteurl = args[0];

    const splits = siteurl.split('://');
    const protocol = splits[0];

    if(protocol!='http' && protocol!='https'){
        console.log("Please pass in a full URL");
    }
    const sitepath = splits[1].replace("/","====").split("====")[1];
    const sitedomain = splits[1].replace("/","====").split("====")[0];

    if(sitedomain!=''){
        var dns = require('dns');
        var dnsPromises =dns.promises;
        var dnsinfo = {};
        var recordtypes = ['A','AAAA','ANY','CNAME','MX','TXT','NS','NAPTR','PTR','SOA','SRV'];
        for(var i=0; i<recordtypes.length; i++){
            var current = recordtypes[i];
            //console.log("o",current);
            await dnsPromises.resolve(sitedomain,current).then((info) => {
                if(info){
                    dnsinfo[current]=info;
                }
            }).catch((error) => {
                //console.log('error',error);
            });
        }

        fs.writeFile('data/dns.txt', JSON.stringify(dnsinfo), err => {
            if (err) {
                console.error(err)
                return
            }
            console.log("DNS data saved");
        });
    }

    /*global links variables */
    const sitelinks=[];
    const externallinks=[];

    /*Begin Crawler*/
    console.log("Starting Crawler");
    const starttime = new Date();
    const browser = await puppeteer.launch({headless:true,'ignoreHTTPSErrors':true});

    async function process_url(pageurl){
        if(!sitelinks.includes(pageurl)){
            sitelinks.push(pageurl);
            // Instructs the blank page to navigate a URL
            let page = await browser.newPage();
            //set user agent
            await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1');
            await page.goto(pageurl, {waitUntil: 'networkidle2'});

            //await page.pdf({ path: 'overview.pdf' }); /*saves pdf of page*/

            // Get page title
            await page.waitForSelector('title');
            const title = await page.title();

            //console.log(`The title is: ${title}`);

            /*capture console errors/messages*/
            await page
            .on('console', message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
            .on('pageerror', ({ message }) => console.log(message))
            .on('response', function(response){
                //console.log(`${response.status()} ${response.url()}`);
            })
            .on('requestfailed', request => console.log(`${request.failure().errorText} ${request.url()}`));

            // Get Page Metrics
            //let metrics = await page.evaluate(() => JSON.stringify(window.performance));

            /*Get all urls on current page.*/
            let urls = await page.$$eval('a', as => as.map(a => a.href));

            let ct=urls.length;
            for(let i=0; i<ct; i++){
                if(!sitelinks.includes(urls[i]) && urls[i].startsWith(protocol+'://'+sitedomain)){/* process internal urls only */
                    //console.log(urls[i]);
                    await process_url(urls[i]);
                }else{
                    if(!urls[i].startsWith(protocol+'://'+sitedomain)){
                        externallinks.push(urls[i]);
                    }
                }
            }
        }
    }
    await process_url(siteurl);

    await fs.writeFile('data/sitelinks.txt', JSON.stringify(sitelinks), err => {
        if (err) {
            console.error(err);
            return
        }
        console.log("sitelinks saved");
    });

    await fs.writeFile('data/externallinks.txt', JSON.stringify(externallinks), err => {
        if (err) {
            console.error(err);
            return
        }
        console.log("externallinks saved");
    });

    browser.close();
    console.log("Crawler End.");
    const endtime = new Date();
    console.log("Crawl Duration: "+((endtime-starttime)/1000)+" seconds.");
})();