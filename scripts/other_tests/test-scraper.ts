import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://audioplugin.deals/shop/';
const TARGET_NAME = "Harmony Bloom"; 

async function testBatch() {
    console.log(`🔍 STARTING BATCH TEST (Target: "${TARGET_NAME}" + 4 Neighbors)...`);
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log(`   🔌 Connecting...`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // --- 1. HUNT FOR TARGET ---
        let startIndex = -1;
        
        for (let scroll = 1; scroll <= 10; scroll++) {
            console.log(`   🚜 Scroll Batch ${scroll}/10...`);
            
            // Get titles to check visibility
            const visibleTitles = await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('.jet-listing-grid__item, .product'));
                return items.map(el => {
                    const titleEl = el.querySelector('h2 a, h6 a, .product_title, .woocommerce-loop-product__title');
                    return titleEl ? (titleEl as HTMLElement).innerText.trim() : "Unknown";
                });
            });

            startIndex = visibleTitles.findIndex(t => t.includes(TARGET_NAME));

            if (startIndex !== -1) {
                console.log(`   🎯 FOUND "${TARGET_NAME}" at Index ${startIndex}. Starting Batch Scrape...`);
                break;
            }

            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 2000));
        }

        if (startIndex === -1) {
            console.error("❌ Could not find target to start batch.");
            return;
        }

        // --- 2. SCRAPE BATCH (Target + 4 Neighbors) ---
        const allHandles = await page.$$('.jet-listing-grid__item, .product');
        const batchHandles = allHandles.slice(startIndex, startIndex + 5);

        console.log(`   🔎 Analyzing ${batchHandles.length} items...`);

        for (let i = 0; i < batchHandles.length; i++) {
            const handle = batchHandles[i];

            // Highlight
            await handle.evaluate((el: any) => {
                el.scrollIntoView({ block: "center", behavior: "instant" });
                el.style.border = "4px solid #00ff00"; // Green for Success
            });
            await new Promise(r => setTimeout(r, 500));

            const data = await page.evaluate((el: any) => {
                let title = "Unknown";
                let priceRaw = "0";
                let opRaw = "0";
                let method = "FAILED";

                // A. Get Title
                const titleEl = el.querySelector('h2 a, h6 a, .product_title, .woocommerce-loop-product__title');
                if (titleEl) title = (titleEl as HTMLElement).innerText.trim();

                // B. Strict Price Logic (The Proven Fix)
                const clone = el.cloneNode(true) as HTMLElement;
                clone.querySelectorAll('.apd-listing-base-price').forEach((e: any) => e.remove()); // NUKE BASE PRICE

                const strikeEl = clone.querySelector('.apd-listing-retail-price-strikethrough .amount');
                const saleEl = clone.querySelector('.apd-listing-sale-price .amount');
                const retailEl = clone.querySelector('.apd-listing-retail-price .amount'); 

                if (saleEl) {
                    priceRaw = (saleEl as HTMLElement).innerText;
                    opRaw = strikeEl ? (strikeEl as HTMLElement).innerText : priceRaw;
                    method = "Strict Class (Sale)";
                } else if (retailEl) {
                    priceRaw = (retailEl as HTMLElement).innerText;
                    opRaw = (retailEl as HTMLElement).innerText;
                    method = "Strict Class (Retail)";
                }

                // C. Fallback for Squashed Text (Safety Net)
                if (priceRaw === "0") {
                    const text = clone.innerText.replace(/\s/g, '');
                    const matches = text.match(/(\$\d+\.?\d*)/g);
                    if (matches && matches.length >= 2) {
                        opRaw = matches[0];
                        priceRaw = matches[1];
                        method = "Squashed Text Fallback";
                    }
                }

                return { title, priceRaw, opRaw, method };
            }, handle);

            // Clear Highlight
            await handle.evaluate((el: any) => { el.style.border = "none"; });

            console.log(`   [Item ${i + 1}] ${data.title}`);
            console.log(`       Price:    ${data.priceRaw}`);
            console.log(`       Original: ${data.opRaw}`);
            console.log(`       Method:   ${data.method}`);
            console.log(`       -------------------------------------------`);
        }

    } catch (error: any) {
        console.error("❌ Error:", error.message);
    } finally {
        await browser.close();
    }
}

testBatch();