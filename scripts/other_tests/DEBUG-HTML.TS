import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://audioplugin.deals/shop/';

async function debugHtml() {
    console.log(`🔍 STARTING X-RAY DEBUG...`);
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log(`   🔌 Connecting to ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait for hydration
        await new Promise(r => setTimeout(r, 4000));

        console.log(`   📸 Grabbing HTML of the FIRST product card...`);

        const html = await page.evaluate(() => {
            // Get the very first product item that failed
            const item = document.querySelector('.jet-listing-grid__item, .product');
            if (!item) return "❌ ERROR: No product element found in DOM.";
            
            // Return its full internal HTML so we can see the price tags
            return item.innerHTML;
        });

        console.log(`\n⬇️⬇️⬇️ HTML DUMP START ⬇️⬇️⬇️\n`);
        console.log(html);
        console.log(`\n⬆️⬆️⬆️ HTML DUMP END ⬆️⬆️⬆️\n`);

    } catch (error: any) {
        console.error("❌ Debug Failed:", error.message);
    } finally {
        await browser.close();
    }
}

debugHtml();