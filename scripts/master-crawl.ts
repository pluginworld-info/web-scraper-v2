import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import fs from 'fs'; 
import path from 'path';
import { prisma } from '../src/lib/db/prisma'; 
import { RetailerRole } from '@prisma/client';
import { getSimilarity } from './utils/fuzzy-match';
import { processAndUploadImage } from './utils/image-uploader';

// 1. Enable Stealth Mode
puppeteer.use(StealthPlugin());

// CONFIG
const TARGET_DOMAIN = 'audioplugin.deals'; 
const BASE_URL = 'https://audioplugin.deals/shop/';
const SITE_NAME = "Audio Plugin Deals";
const SITE_LOGO = "https://audioplugin.deals/wp-content/uploads/2020/07/apd_logo_mobile_2x.png"; 
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

// 🚨 FORCE FLAG: Set this to true to OVERWRITE existing data
const FORCE_DEEP_SCRAPE = true; 

const STOP_WORDS = [
    "exclusive deal", "intro price", "limited time", "flash sale", 
    "launch offer", "special offer", "holiday sale", "black friday", 
    "cyber monday", "bundle", "collection", "suite", "software", 
    "plugin", "vst", "au", "aax", "download", "license"
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const sleepWithJitter = (minDelay: number) => {
  const jitter = Math.floor(Math.random() * 3000); 
  const totalDelay = minDelay + jitter;
  if (totalDelay > 4000) console.log(`      💤 Waiting ${(totalDelay/1000).toFixed(1)}s for content load...`);
  return new Promise(resolve => setTimeout(resolve, totalDelay));
};

async function randomMouseMoves(page: any) {
    try {
        const mouse = page.mouse;
        const width = 1920;
        const height = 1080;
        for (let i = 0; i < randomInt(2, 4); i++) {
            const x = randomInt(100, width - 100);
            const y = randomInt(100, height - 100);
            await mouse.move(x, y, { steps: randomInt(10, 30) });
            if (Math.random() > 0.6) await sleepWithJitter(500); 
        }
    } catch(e) {}
}

const parsePrice = (text: string) => {
    if (!text) return 0;
    const cleanText = text.replace(/Original price was:/i, '').split('Original')[0];
    const match = cleanText.match(/(\d+\.?\d{0,2})/); 
    return match ? parseFloat(match[0]) : 0;
};

const cleanTitleString = (title: string, brand: string) => {
    let clean = title.toLowerCase();
    if (brand && brand !== "Unknown") {
        clean = clean.replace(brand.toLowerCase(), '').trim();
    }
    STOP_WORDS.forEach(word => {
        clean = clean.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    return clean.replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
};

// 3-LAYER MATCHING LOGIC
const findBestMatch = (scrapedTitle: string, scrapedBrand: string, dbProducts: any[]) => {
    const cleanScraped = cleanTitleString(scrapedTitle, scrapedBrand);
    let bestMatch = null;
    let bestScore = 0;

    for (const p of dbProducts) {
        const cleanDB = cleanTitleString(p.title, p.brand || "");
        
        if (cleanScraped === cleanDB) return { product: p, score: 1.0, method: "Exact" };

        let isBrandSafe = false;
        if (scrapedBrand === "Unknown" || !p.brand || p.brand === "Unknown") isBrandSafe = true;
        else if (scrapedBrand.toLowerCase() === p.brand.toLowerCase()) isBrandSafe = true;

        if (isBrandSafe) {
            const fuzzyScore = getSimilarity(cleanScraped, cleanDB);
            if (fuzzyScore > bestScore) {
                bestScore = fuzzyScore;
                bestMatch = p;
            }
        }
    }

    if (bestScore > 0.85) return { product: bestMatch, score: bestScore, method: "Fuzzy" };
    return null;
};

// HELPER: Deep Scrape (Still uses Cheerio as it opens a new tab)
async function deepScrapeDetails(browser: any, url: string) {
    let description = "";
    let category = "Plugin"; 
    let brand = "Unknown";
    let originalPrice = 0;
    let salePrice = 0;
    let highResImage = null;

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
        if (descContainer.length > 0) description = descContainer.find('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
        else {
             const tabContainer = $('#tab-description');
             if (tabContainer.length > 0) description = tabContainer.find('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
        }
        if (!description || description.length < 50) description = $('.elementor-widget-text-editor').first().text().trim();

        description = description.replace(/Subscribe« Prev1 \/ 1Next »/g, '').replace(/« Prev/g, '').replace(/Next »/g, '').trim().substring(0, 2000); 

        const catText = $('.posted_in a').first().text(); 
        if (catText) category = catText.trim();
        else {
             const metaText = $('.posted_in').text(); 
             if (metaText.includes(':')) category = metaText.split(':')[1].trim();
        }

        const title = $('h1.product_title').text().trim();
        if (title.toLowerCase().includes(" by ")) brand = title.split(/ by /i)[1].trim();

        let opRaw = $('.productpricecustom del .woocommerce-Price-amount').text() || $('.elementor-heading-title del .woocommerce-Price-amount').text();
        originalPrice = parsePrice(opRaw);
        let spRaw = $('.productpricecustom ins .woocommerce-Price-amount').text() || $('.elementor-heading-title ins .woocommerce-Price-amount').text();
        salePrice = parsePrice(spRaw);

        const imgEl = $('.jet-listing-dynamic-image__img');
        if (imgEl.length > 0) highResImage = imgEl.attr('src') || imgEl.attr('data-src');

        await page.close();
    } catch (e) { }

    return { description, category, brand, originalPrice, salePrice, highResImage };
}

// ✅ HELPER: HUMAN SCROLL ENGINE
async function autoScroll(page: any) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 150;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

// ✅ HELPER: AGGRESSIVE Infinite Scroll
async function infiniteScrollAndScrape(page: any, browser: any, retailerId: string, scrapeDelay: number) {
    console.log("   📜 Starting Infinite Scroll Engine...");
    
    const dbProducts = await prisma.product.findMany({ select: { id: true, title: true, brand: true, slug: true, image: true } });
    console.log(`   🧠 Loaded ${dbProducts.length} existing products for matching.`);

    let previousCount = 0;
    let noChangeCount = 0;
    let totalProductsFound = 0;
    let totalProductsSkipped = 0; 
    const processedUrls = new Set<string>();

    while (true) {
        // 1. Scrape Current View (Using LIVE DOM, not Snapshot)
        const { newItemsCount, skippedCount } = await scrapeVisibleProducts(page, browser, retailerId, processedUrls, scrapeDelay, dbProducts);
        totalProductsFound += newItemsCount;
        totalProductsSkipped += skippedCount;

        if (newItemsCount > 0 || skippedCount > 0) {
             console.log(`      📊 BATCH REPORT: ${newItemsCount} New | ${skippedCount} Skipped | Total Scraped: ${totalProductsFound}`);
        }

        // 2. CHECK CURRENT DOM COUNT
        const currentItemCount = await page.evaluate(() => document.querySelectorAll('.jet-listing-grid__item, .product, .type-product').length);
        
        // 3. HUMAN SCROLL TO BOTTOM
        console.log(`      ⬇️ Scrolling down to load more (Current items: ${currentItemCount})...`);
        await autoScroll(page);
        
        // 4. CHECK FOR "LOAD MORE" BUTTON
        const loadMoreSelectors = ['.jet-listing-grid__load-more', '.jet-load-more-button', 'a.next.page-numbers', 'button.load-more'];
        for (const sel of loadMoreSelectors) {
            if (await page.$(sel)) {
                console.log(`      🖱️ Found Navigation Button (${sel}). Clicking...`);
                try {
                    await page.click(sel);
                    await sleepWithJitter(5000); 
                } catch(e) {}
            }
        }

        // 5. EXTENDED WAIT
        console.log("      ⏳ Waiting 12s for lazy load...");
        await sleepWithJitter(12000); 

        // 6. CHECK FOR GROWTH
        const newItemCount = await page.evaluate(() => document.querySelectorAll('.jet-listing-grid__item, .product, .type-product').length);
        
        if (newItemCount === currentItemCount) {
            noChangeCount++;
            console.log(`      ⚠️ DOM count didn't change: ${newItemCount} items (${noChangeCount}/3)`);
            if (noChangeCount >= 3) {
                console.log("      🛑 Page stopped growing. Crawl Finished.");
                break;
            }
        } else {
            console.log(`      ✅ Content grew! (${currentItemCount} -> ${newItemCount})`);
            previousCount = newItemCount;
            noChangeCount = 0;
        }
    }
    return { totalProductsFound, totalProductsSkipped };
}

// ✅ CORE SCRAPER FUNCTION: REPLACED CHEERIO WITH LIVE DOM EVALUATION
async function scrapeVisibleProducts(page: any, browser: any, retailerId: string, processedUrls: Set<string>, scrapeDelay: number, dbProducts: any[]) {
    
    // 1. EXTRACT DATA DIRECTLY FROM BROWSER CONTEXT (No Cheerio Snapshot)
    const productsData = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.jet-listing-grid__item, .product, .type-product, .wc-block-grid__product'));
        
        return items.map((el: any) => {
            const btn = el.querySelector('a.cart-button'); 
            const titleEl = el.querySelector('h2.elementor-heading-title a, .woocommerce-loop-product__title');
            
            let title = titleEl ? titleEl.innerText.trim() : "";
            if (!title && btn) title = btn.getAttribute('data-product-title') || btn.getAttribute('data-product_title') || "";
            
            let link = titleEl ? titleEl.getAttribute('href') : null;
            
            // Image
            let imgRaw = null;
            const imgEl = el.querySelector('.elementor-widget-image img, img.attachment-woocommerce_thumbnail');
            if (imgEl) imgRaw = imgEl.getAttribute('data-src') || imgEl.getAttribute('src');

            // Prices
            let priceRaw = null;
            const insEl = el.querySelector('.deal-card-price-content ins .woocommerce-Price-amount, .price ins .amount');
            if (insEl) priceRaw = insEl.innerText;
            if (!priceRaw && btn) priceRaw = btn.getAttribute('data-base-price') || btn.getAttribute('data-price');
            
            let opRaw = null;
            const delEl = el.querySelector('.deal-card-price-content del .woocommerce-Price-amount, .price del .amount');
            if (delEl) opRaw = delEl.innerText;

            return { title, link, imgRaw, priceRaw, opRaw };
        });
    });

    let newItemsInThisBatch = 0;
    let skippedInThisBatch = 0;

    if (productsData.length === 0) return { newItemsCount: 0, skippedCount: 0 };

    // PROCESS THE RAW DATA IN NODE.JS
    for (const item of productsData) {
        let { title, link, imgRaw, priceRaw, opRaw } = item;

        if (!title || !link) continue;
        if (link.startsWith('/')) link = `https://audioplugin.deals${link}`;

        if (processedUrls.has(link)) {
            skippedInThisBatch++;
            continue;
        }
        processedUrls.add(link);
        newItemsInThisBatch++; 

        let price = parsePrice(priceRaw || "");
        let originalPrice = parsePrice(opRaw || "");
        if (originalPrice === 0 && price > 0) originalPrice = price; 

        // Brand Parsing
        let brand = "Unknown";
        let cleanTitle = title;
        if (title.toLowerCase().includes(" by ")) {
            const parts = title.split(/ by /i);
            cleanTitle = parts[0].trim();
            brand = parts[1].trim();
        }

        // --- DEEP SCRAPE LOGIC ---
        const isGarbage = !brand || brand === "Unknown";
        let description = "";
        let category = "Plugin";
        let finalImage = null;

        if (FORCE_DEEP_SCRAPE || isGarbage) {
            console.log(`      🕵️ Deep Scraping Inner Page for: ${title}`);
            const details = await deepScrapeDetails(browser, link);
            
            if (details.description) description = details.description;
            if (details.category) category = details.category;
            if (details.brand !== "Unknown") brand = details.brand;
            if (details.highResImage) imgRaw = details.highResImage;
            if (details.salePrice > 0) price = details.salePrice;
            if (details.originalPrice > 0) originalPrice = details.originalPrice;

            await sleepWithJitter(scrapeDelay);
        }

        // --- MATCHING ---
        const matchResult = findBestMatch(cleanTitle, brand, dbProducts);
        
        let productId: string | null = null;
        let slug = slugify(cleanTitle, { lower: true, strict: true });

        if (matchResult) {
            console.log(`      🔗 MATCHED EXISTING: ${matchResult.product.title}`);
            productId = matchResult.product.id;
            slug = matchResult.product.slug;
            
            if (!matchResult.product.image && imgRaw) {
                 finalImage = await processAndUploadImage(imgRaw, slug).catch(() => null);
            } else {
                 finalImage = matchResult.product.image;
            }
        } else {
            console.log(`      ✨ NEW PRODUCT DETECTED: ${cleanTitle}`);
            if (imgRaw) {
                process.stdout.write(`      📥 Uploading Image... `); 
                finalImage = await processAndUploadImage(imgRaw, slug).catch(() => null);
                console.log(finalImage ? "Done." : "Failed.");
            }
        }

        // --- DB UPSERT ---
        await prisma.$transaction(async (tx) => {
            let product;
            
            if (productId) {
                product = await tx.product.update({
                    where: { id: productId },
                    data: { description, category, brand, image: finalImage || undefined, updatedAt: new Date() }
                });
            } else {
                product = await tx.product.create({
                    data: {
                        title: cleanTitle, slug, image: finalImage,
                        description: description || "No description available",
                        brand, category, tags: [category]
                    }
                });
                dbProducts.push({ id: product.id, title: cleanTitle, brand, slug, image: finalImage });
            }

            const listing = await tx.listing.upsert({
                where: { url: link },
                update: { price, originalPrice, lastScraped: new Date(), productId: product.id },
                create: {
                    url: link, title: cleanTitle, price, originalPrice, 
                    retailerId: retailerId, productId: product.id 
                }
            });

            await tx.priceHistory.create({ data: { listingId: listing.id, price } });
        });
    }
    return { newItemsCount: newItemsInThisBatch, skippedCount: skippedInThisBatch };
}

async function startMasterCrawl() {
    console.log(`🚀 STARTING V3 MASTER CRAWL (LIVE DOM EVALUATION MODE)`);
    console.log(`   Target: ${BASE_URL}`);

    if (!fs.existsSync(KEY_PATH)) return;

    const retailer = await prisma.retailer.upsert({
        where: { name: SITE_NAME },
        update: { logo: SITE_LOGO },
        create: { name: SITE_NAME, domain: TARGET_DOMAIN, role: RetailerRole.MASTER, scrapeDelay: 5000, logo: SITE_LOGO }
    });

    const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({ 'Referer': 'https://www.google.com/', 'Accept-Language': 'en-US,en;q=0.9' });

        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await randomMouseMoves(page);
        
        const { totalProductsFound, totalProductsSkipped } = await infiniteScrollAndScrape(page, browser, retailer.id, retailer.scrapeDelay);

        console.log(`\n✅ CRAWL COMPLETE!`);
        console.log(`   - Total Processed: ${totalProductsFound + totalProductsSkipped}`);

    } catch (error: any) {
        console.error("❌ Critical Error:", error.message);
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

startMasterCrawl();