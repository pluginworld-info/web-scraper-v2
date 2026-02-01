import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://audioplugin.deals/shop/';
const TARGET_NAME = "Harmony Bloom"; 

async function testHarmony() {
    console.log(`🔍 HUNTING FOR: "${TARGET_NAME}"...`);
    
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
        
        // --- SCROLL & SEARCH LOOP ---
        let targetIndex = -1;
        
        for (let scroll = 1; scroll <= 10; scroll++) {
            console.log(`   🚜 Scroll Batch ${scroll}/10...`);
            
            // 1. Get all visible titles to check what we see
            const visibleTitles = await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('.jet-listing-grid__item, .product'));
                return items.map(el => {
                    const titleEl = el.querySelector('h2 a, h6 a, .product_title, .woocommerce-loop-product__title');
                    return titleEl ? titleEl.innerText.trim() : "Unknown";
                });
            });

            // 2. Check if our target is in the list
            targetIndex = visibleTitles.findIndex(t => t.includes("Harmony Bloom"));

            if (targetIndex !== -1) {
                console.log(`   🎯 MATCH FOUND at Index ${targetIndex}: "${visibleTitles[targetIndex]}"`);
                break; // Stop scrolling
            }

            // 3. Not found? Scroll down.
            console.log(`      ❌ Not found yet. (Saw: ${visibleTitles.length} items). Scrolling...`);
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 2000));
        }

        if (targetIndex === -1) {
            console.error("❌ Failed to find 'Harmony Bloom' after 10 scrolls.");
            return;
        }

        // --- TARGET FOUND: EXTRACT DETAILS ---
        const allHandles = await page.$$('.jet-listing-grid__item, .product');
        const handle = allHandles[targetIndex];

        // Highlight
        await handle.evaluate((el: any) => {
            el.scrollIntoView({ block: "center" });
            el.style.border = "5px solid #ff00ff"; 
        });
        await new Promise(r => setTimeout(r, 1000));

        const data = await page.evaluate((el: any) => {
            let title = "Unknown";
            let priceRaw = "0";
            let opRaw = "0";
            let method = "FAILED";

            // 1. Get Title
            const titleEl = el.querySelector('h2 a, h6 a, .product_title, .woocommerce-loop-product__title');
            if (titleEl) title = (titleEl as HTMLElement).innerText.trim();

            // 2. STRICT PRICE LOGIC
            const clone = el.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.apd-listing-base-price').forEach((e: any) => e.remove()); // NUKE BASE PRICE

            // Classes
            const strikeEl = clone.querySelector('.apd-listing-retail-price-strikethrough .amount');
            const saleEl = clone.querySelector('.apd-listing-sale-price .amount');
            const retailEl = clone.querySelector('.apd-listing-retail-price .amount'); 

            if (saleEl) {
                priceRaw = (saleEl as HTMLElement).innerText;
                // If strikethrough exists, use it. Otherwise, Original = Sale.
                opRaw = strikeEl ? (strikeEl as HTMLElement).innerText : priceRaw;
                method = "Strict Class (Sale)";
            } else if (retailEl) {
                priceRaw = (retailEl as HTMLElement).innerText;
                opRaw = (retailEl as HTMLElement).innerText;
                method = "Strict Class (Retail)";
            }

            // Fallback for "Squashed" text ($31.00$10.00) if classes fail
            if (priceRaw === "0") {
                const text = clone.innerText.replace(/\s/g, '');
                const matches = text.match(/(\$\d+\.?\d*)/g);
                if (matches && matches.length >= 2) {
                    opRaw = matches[0]; // First is original
                    priceRaw = matches[1]; // Second is sale
                    method = "Squashed Text Fallback";
                }
            }

            return { title, priceRaw, opRaw, method };
        }, handle);

        console.log(`\n✅ FINAL DATA:`);
        console.log(`   Title:    ${data.title}`);
        console.log(`   Price:    ${data.priceRaw}`);
        console.log(`   Original: ${data.opRaw}`);
        console.log(`   Method:   ${data.method}`);
        console.log(`-------------------------------------------`);

    } catch (error: any) {
        console.error("❌ Error:", error.message);
    } finally {
        await browser.close();
    }
}

testHarmony();