import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import slugify from 'slugify';
import fs from 'fs'; 
import path from 'path';
import { prisma } from '../../src/lib/db/prisma'; 
import { RetailerRole } from '@prisma/client';
import { getSimilarity } from '../utils/fuzzy-match';
import { processAndUploadImage } from '../utils/image-uploader';
import * as cheerio from 'cheerio'; 

puppeteer.use(StealthPlugin());

const TARGET_DOMAIN = 'audioplugin.deals'; 
const BASE_URL = 'https://audioplugin.deals/shop/';
const SITE_NAME = "Audio Plugin Deals";
const SITE_LOGO = "https://audioplugin.deals/wp-content/uploads/2020/07/apd_logo_mobile_2x.png"; 
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

const FORCE_DEEP_SCRAPE = true; 

// 🚨 RESUME CONFIGURATION
// Set this to the index number where it crashed (e.g., 166)
const RESUME_FROM_INDEX = 533; 

// --- HELPERS ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const sleepWithJitter = (minDelay: number) => {
    const jitter = Math.floor(Math.random() * 2000); 
    return new Promise(resolve => setTimeout(resolve, minDelay + jitter));
};

async function randomMouseMoves(page: any) {
    try {
        const width = 1920; const height = 1080;
        for (let i = 0; i < randomInt(2, 5); i++) {
            await page.mouse.move(randomInt(100, width - 100), randomInt(100, height - 100), { steps: randomInt(10, 30) });
            if (Math.random() > 0.8) await sleepWithJitter(200);
        }
    } catch(e) {}
}

const parsePrice = (text: string) => {
    if (!text) return 0;
    const cleanText = text.replace(/Original price was:/i, '').replace(/[^\d.,]/g, '').replace(/,/g, '');      
    const match = cleanText.match(/(\d+\.?\d{0,2})/); 
    return match ? parseFloat(match[0]) : 0;
};

const cleanTitleString = (title: string, brand: string) => {
    let clean = title.toLowerCase();
    if (brand && brand !== "Unknown") clean = clean.replace(brand.toLowerCase(), '').trim();
    return clean.replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
};

const findBestMatch = (scrapedTitle: string, scrapedBrand: string, dbProducts: any[]) => {
    const cleanScraped = cleanTitleString(scrapedTitle, scrapedBrand);
    let bestMatch = null;
    let bestScore = 0;
    for (const p of dbProducts) {
        const cleanDB = cleanTitleString(p.title, p.brand || "");
        if (cleanScraped === cleanDB) return { product: p, score: 1.0, method: "Exact" };
        let isBrandSafe = (scrapedBrand === "Unknown" || !p.brand || p.brand === "Unknown" || scrapedBrand.toLowerCase() === p.brand.toLowerCase());
        if (isBrandSafe) {
            const fuzzyScore = getSimilarity(cleanScraped, cleanDB);
            if (fuzzyScore > bestScore) { bestScore = fuzzyScore; bestMatch = p; }
        }
    }
    return bestScore > 0.85 ? { product: bestMatch, score: bestScore, method: "Fuzzy" } : null;
};

async function deepScrapeDetails(browser: any, url: string) {
    let description = "", category = "Plugin", brand = "Unknown", highResImage = null;
    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
            if (['font', 'media', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const content = await page.content();
        const $ = cheerio.load(content);

        const descContainer = $('.woocommerce-product-details__short-description');
        if (descContainer.length > 0) {
            description = descContainer.find('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
        } else {
            description = $('#tab-description').find('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
        }
        if (!description || description.length < 50) description = $('.elementor-widget-text-editor').first().text().trim();
        description = description.replace(/Subscribe« Prev1 \/ 1Next »/g, '').trim().substring(0, 2000); 

        const catText = $('.posted_in a').first().text(); 
        if (catText) category = catText.trim();
        
        const titleText = $('h1.product_title').text().trim();
        if (titleText.toLowerCase().includes(" by ")) brand = titleText.split(/ by /i)[1].trim();

        const imgEl = $('.jet-listing-dynamic-image__img');
        if (imgEl.length > 0) highResImage = imgEl.attr('src') || imgEl.attr('data-src');

        await page.close();
    } catch (e) { }
    return { description, category, brand, highResImage };
}

async function harvestAllProducts(page: any) {
    console.log("   🚜 PHASE 1: Harvesting Products (Deep Scroll Scan)...");
    
    const harvestedMap = new Map<string, any>();
    let previousHeight = 0;
    let stuckCycles = 0;

    await page.evaluate(() => window.scrollBy(0, 1500));
    await sleepWithJitter(2000);

    while (true) {
        // A. Extract Visible Items using STRICT Logic AND Visibility Filter
        const batch = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.jet-listing-grid__item, .product, .type-product'))
                .filter((el: any) => el.offsetParent !== null); 
            
            return items.map((el: any) => {
                let title = "Unknown";
                const titleSelectors = [
                    'h2.elementor-heading-title a', 'h6.elementor-heading-title a', 
                    '.product_title', '.woocommerce-loop-product__title', '.jet-listing-dynamic-link__label'
                ];
                for (const sel of titleSelectors) {
                    const t = el.querySelector(sel);
                    if (t && t.innerText.trim().length > 2) { title = t.innerText.trim(); break; }
                }
                
                const link = el.querySelector('a')?.getAttribute('href');
                const imgRaw = el.querySelector('.elementor-widget-image img, img.attachment-woocommerce_thumbnail')?.getAttribute('data-src') || el.querySelector('img')?.getAttribute('src');

                let priceRaw = "0";
                let opRaw = "0";

                const clone = el.cloneNode(true);
                clone.querySelectorAll('.apd-listing-base-price').forEach((node: any) => node.remove());

                const saleEl = clone.querySelector('.apd-listing-sale-price .amount');
                const strikeEl = clone.querySelector('.apd-listing-retail-price-strikethrough .amount');
                const retailEl = clone.querySelector('.apd-listing-retail-price .amount');

                if (saleEl) {
                    priceRaw = saleEl.innerText;
                    opRaw = strikeEl ? strikeEl.innerText : priceRaw;
                } else if (retailEl) {
                    priceRaw = retailEl.innerText;
                    opRaw = retailEl.innerText;
                }

                if (priceRaw === "0") {
                    const headings = Array.from(clone.querySelectorAll('h2, .elementor-heading-title'));
                    for (const h of headings) {
                        const txt = (h as HTMLElement).innerText.trim();
                        if ((txt.includes('$') || txt.includes('€')) && txt.length < 15 && txt !== title) {
                            priceRaw = txt;
                            opRaw = txt; 
                            break;
                        }
                    }
                }

                return { title, link, imgRaw, priceRaw, opRaw };
            });
        });

        let newItems = 0;
        for (const item of batch) {
            if (item.title !== "Unknown" && item.link && !harvestedMap.has(item.link)) {
                harvestedMap.set(item.link, item);
                newItems++;
            }
        }

        console.log(`      🧺 Scanned batch. New: ${newItems} | Total Found: ${harvestedMap.size}`);

        if (newItems === 0) stuckCycles++;
        else stuckCycles = 0;

        if (stuckCycles > 4) {
            console.log("      🛑 No new items found for 4 cycles. Stopping scan.");
            break;
        }

        await randomMouseMoves(page);
        
        const loadMoreBtn = await page.$('.jet-listing-grid__load-more, .jet-load-more-button, a.next.page-numbers');
        if (loadMoreBtn) {
            try { 
                await loadMoreBtn.click(); 
                process.stdout.write(" [Load More Clicked] ");
                await sleepWithJitter(3000); 
            } catch(e) {}
        } else {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await sleepWithJitter(1500);
        }

        const newHeight = await page.evaluate('document.body.scrollHeight');
        const scrollY = await page.evaluate('window.scrollY + window.innerHeight');
        if (newHeight === previousHeight && scrollY >= newHeight - 100) {
            console.log("      🛑 Reached Bottom.");
            break;
        }
        previousHeight = newHeight;
    }

    return Array.from(harvestedMap.values());
}

async function processProductList(browser: any, productList: any[], retailer: any) {
    console.log(`\n   ⚙️ PHASE 2: Processing ${productList.length} Items (Deep Scrape & Save)...`);
    
    // 🚨 RESUME LOGIC
    if (RESUME_FROM_INDEX > 0) {
        console.log(`   ⏭️ SKIPPING first ${RESUME_FROM_INDEX} items to resume crawl...`);
        productList = productList.slice(RESUME_FROM_INDEX);
    }
    
    const dbProducts = await prisma.product.findMany({ select: { id: true, title: true, brand: true, slug: true, image: true } });

    for (let i = 0; i < productList.length; i++) {
        const item = productList[i];
        const displayIndex = RESUME_FROM_INDEX + i + 1; // Correct counter
        
        let link = item.link.startsWith('/') ? `https://audioplugin.deals${item.link}` : item.link;
        let cleanTitle = item.title;
        let brand = "Unknown";
        if (item.title.toLowerCase().includes(" by ")) {
            const parts = item.title.split(/ by /i);
            cleanTitle = parts[0].trim();
            brand = parts[1].trim();
        }

        const price = parsePrice(item.priceRaw);
        const originalPrice = parsePrice(item.opRaw) || price;

        let description = "", category = "Plugin";
        if (FORCE_DEEP_SCRAPE) {
            const details = await deepScrapeDetails(browser, link);
            
            if (details) {
                description = details.description || "";
                category = details.category || "Plugin";
                if (details.brand !== "Unknown") brand = details.brand; 
                if (details.highResImage) item.imgRaw = details.highResImage;
            }
            await sleepWithJitter(retailer.scrapeDelay);
        }

        const match = findBestMatch(cleanTitle, brand, dbProducts);
        let productId = match?.product.id;
        let slug = match?.product.slug || slugify(cleanTitle, { lower: true, strict: true });
        let finalImage = match?.product.image;

        if ((!finalImage || finalImage === 'null') && item.imgRaw) {
            finalImage = await processAndUploadImage(item.imgRaw, slug).catch(() => null);
        }

        console.log(`   [${displayIndex}] ${cleanTitle}`);
        console.log(`      💰 Sale: $${price} | Reg: $${originalPrice}`);
        console.log(`      🏷️  Brand: ${brand} | Cat: ${category}`);
        console.log(`      🖼️  Image: ${finalImage ? "✅ Uploaded" : "❌ Missing"}`);

        // 🚨 RETRY LOGIC FOR DB TRANSACTION
        for(let attempt=0; attempt<3; attempt++) {
            try {
                await prisma.$transaction(async (tx) => {
                    const product = productId 
                        ? await tx.product.update({
                            where: { id: productId },
                            data: { description, brand, category, image: finalImage || undefined, updatedAt: new Date() }
                        })
                        : await tx.product.create({
                            data: { title: cleanTitle, slug, image: finalImage, description: description || "N/A", brand, category, tags: [category] }
                        });

                    if (!productId) dbProducts.push(product);

                    const lst = await tx.listing.upsert({
                        where: { url: link },
                        update: { price, originalPrice, lastScraped: new Date() },
                        create: { url: link, title: cleanTitle, price, originalPrice, retailerId: retailer.id, productId: product.id }
                    });

                    await tx.priceHistory.create({ data: { listingId: lst.id, price } });
                });
                break; // Success! Exit retry loop
            } catch(e) {
                console.warn(`      ⚠️ DB Timeout (Attempt ${attempt+1}/3). Waiting 5s...`);
                await sleepWithJitter(5000);
            }
        }
        
        // 🚨 STABILITY PAUSE: Let the database breathe
        await new Promise(r => setTimeout(r, 500)); 
    }
}

async function startMasterCrawl() {
    console.log(`🚀 STARTING MASTER CRAWL V11 (RESUME MODE: ${RESUME_FROM_INDEX})`);
    if (!fs.existsSync(KEY_PATH)) return;

    const retailer = await prisma.retailer.upsert({
        where: { name: SITE_NAME },
        update: { logo: SITE_LOGO, role: "MASTER" as RetailerRole },
        create: { name: SITE_NAME, domain: TARGET_DOMAIN, role: "MASTER" as RetailerRole, scrapeDelay: 5000, logo: SITE_LOGO }
    });

    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas'] 
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log(`   🔌 Connecting to ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
        
        const allItems = await harvestAllProducts(page);
        await processProductList(browser, allItems, retailer);
        
        console.log(`\n✅ CRAWL COMPLETE!`);

    } catch (error: any) {
        console.error("❌ Critical Error:", error.message);
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

startMasterCrawl();