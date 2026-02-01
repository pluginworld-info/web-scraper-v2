import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import fs from 'fs'; 
import path from 'path';
import { prisma } from '../../src/lib/db/prisma'; 
import { RetailerRole } from '@prisma/client';
import { getSimilarity } from '../utils/fuzzy-match';

// 1. Setup Stealth
puppeteer.use(StealthPlugin());

// --- CONFIGURATION ---
// Change this URL to target different pages (e.g., /deals, /instruments, /effects)
const BASE_URL = 'https://www.pluginboutique.com/deals'; 

const RETAILER_NAME = "Plugin Boutique";
const RETAILER_DOMAIN = "pluginboutique.com";
const RETAILER_LOGO = "https://audioplugin.deals/wp-content/uploads/2023/08/pluginboutique-logo.png"; 
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

// --- HELPERS ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = async (min = 1000, max = 3000) => {
    const ms = randomInt(min, max);
    await new Promise(r => setTimeout(r, ms));
};

const parsePrice = (text: string) => {
    if (!text) return 0;
    // Cleans up "(84% off)" artifacts and currency symbols
    const cleanText = text.replace(/\(\d+% off\)/gi, '').replace(/[^\d.,]/g, '').trim(); 
    const match = cleanText.match(/(\d+\.?\d{0,2})/); 
    return match ? parseFloat(match[0]) : 0;
};

// --- VERSION GUARDRAIL (CRITICAL) ---
// Prevents "Total Studio 5" from matching "Total Studio 3.5"
const extractVersion = (text: string): string | null => {
    const match = text.match(/\bv?(\d+(\.\d+)?)\b/);
    return match ? match[1] : null;
};

const checkVersionMismatch = (titleA: string, titleB: string): boolean => {
    const vA = extractVersion(titleA);
    const vB = extractVersion(titleB);
    
    // If both have versions, and they are different, it's a mismatch.
    if (vA && vB && vA !== vB) return true;
    return false;
};

// --- 3-LAYER MATCHING LOGIC ---
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
        // 🚨 LAYER 1: VERSION CHECK
        if (checkVersionMismatch(scrapedTitle, p.title)) continue; 

        const cleanDB = cleanTitleString(p.title, p.brand || "");
        
        // 🚨 LAYER 2: EXACT MATCH
        if (cleanScraped === cleanDB) return { product: p, score: 1.0, method: "Exact" };

        // 🚨 LAYER 3: BRAND-GATED FUZZY
        let isBrandSafe = false;
        if (scrapedBrand === "Unknown" || !p.brand || p.brand === "Unknown") isBrandSafe = true;
        else if (scrapedBrand.toLowerCase() === p.brand.toLowerCase()) isBrandSafe = true;

        if (isBrandSafe) {
            const fuzzyScore = getSimilarity(cleanScraped, cleanDB);
            if (fuzzyScore > bestScore) { bestScore = fuzzyScore; bestMatch = p; }
        }
    }

    if (bestScore > 0.85) return { product: bestMatch, score: bestScore, method: "Fuzzy" };
    return null;
};

// --- BROWSER ACTIONS ---

async function closeCookieBanner(page: any) {
    try {
        const bannerSelectors = [
            '#onetrust-accept-btn-handler', 
            '#onetrust-banner-sdk',
            '.osano-cm-accept-all',
            'button[class*="cookie"]'
        ];
        for (const sel of bannerSelectors) {
            if (await page.$(sel)) {
                console.log("   🍪 Closing Cookie Banner...");
                await page.click(sel).catch(() => {});
                await sleep(1000);
                return;
            }
        }
    } catch (e) {}
}

async function randomMouseMoves(page: any) {
    try {
        const mouse = page.mouse;
        await mouse.move(randomInt(300, 1500), randomInt(300, 900), { steps: randomInt(10, 25) });
    } catch(e) {}
}

async function clickLoadMoreAndWait(page: any, previousCount: number): Promise<boolean> {
    console.log("   🔎 Looking for 'Load More' button...");
    const buttonHandle = await page.evaluateHandle(() => {
        return document.querySelector('[data-testid="search-load-more-btn"]') || 
               document.querySelector('#search-load-more a');
    });

    const buttonElement = buttonHandle.asElement();
    if (buttonElement) {
        try {
            console.log("   🖱️ Button found. Scrolling...");
            await page.evaluate((el: any) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), buttonHandle);
            await sleep(1500); 
            await buttonElement.click(); 
            console.log("   🖱️ Clicked. Waiting for content...");
            try {
                await page.waitForFunction((prev: number) => {
                    const count = document.querySelectorAll('div[data-controller="product-tile"]').length;
                    return count > prev; 
                }, { timeout: 15000 }, previousCount);
                return true;
            } catch (e) {
                console.log("   ⚠️ Clicked, but count didn't increase.");
                return false; 
            }
        } catch (e: any) { return false; }
    }
    return false;
}

// --- MAIN SCRAPE FUNCTION ---

async function startScrape() {
    console.log(`🚀 STARTING ${RETAILER_NAME} CRAWL (LITE MODE - NO IMAGES)`);
    console.log(`   Target URL: ${BASE_URL}`);

    if (!fs.existsSync(KEY_PATH)) {
        console.error("❌ ERROR: service-account.json missing.");
        return;
    }

    const retailer = await prisma.retailer.upsert({
        where: { name: RETAILER_NAME },
        update: { logo: RETAILER_LOGO },
        create: {
            name: RETAILER_NAME,
            domain: RETAILER_DOMAIN,
            role: RetailerRole.PRICE_CHECKER,
            logo: RETAILER_LOGO,
            scrapeDelay: 4000
        }
    });

    const browser = await puppeteer.launch({
        headless: false, 
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log(`   🏠 Navigating...`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await closeCookieBanner(page);
        await sleep(3000);

        console.log("   🧠 Loading Master DB for matching...");
        const dbProducts = await prisma.product.findMany({ 
            select: { id: true, title: true, slug: true, tags: true, brand: true, image: true } 
        });
        console.log(`      Loaded ${dbProducts.length} master products.`);

        let hasNextPage = true;
        let pageNum = 1;
        let processedUrls = new Set<string>();

        while (hasNextPage) {
            console.log(`\n📄 Batch ${pageNum} processing...`);
            await randomMouseMoves(page);

            const content = await page.content();
            const $ = cheerio.load(content);
            const productCards = $('div[data-controller="product-tile"]');

            if (productCards.length === 0) break;
            console.log(`   ✅ Found ${productCards.length} visible products.`);

            for (let i = 0; i < productCards.length; i++) {
                const el = productCards[i];
                const $el = $(el);
                
                // --- EXTRACTION ---
                const title = $el.find('[data-testid^="product-name-"]').text().trim();
                let link = $el.find('a[data-product-tile-target="mainLink"]').attr('href');
                
                if (!title || !link) continue;
                if (link.startsWith('/')) link = `https://www.pluginboutique.com${link}`;
                
                if (processedUrls.has(link)) continue;
                processedUrls.add(link);

                const brand = $el.find('[data-product-tile-target="manufacturerLink"]').text().trim() || "Unknown";
                const category = $el.find('[data-product-tile-target="categoryLink"]').text().trim() || "Plugin";

                // --- PRICE LOGIC ---
                let originalPrice = parsePrice($el.find('.line-through').text());
                let price = 0;
                const discountSpan = $el.find('span:contains("off")');
                
                if (discountSpan.length > 0) {
                    price = parsePrice(discountSpan.parent().text());
                } else {
                    const potentialPrice = $el.find('.text-gray-900.font-semibold').first().text();
                    price = parsePrice(potentialPrice);
                }
                if (originalPrice === 0 || originalPrice < price) originalPrice = price;

                // --- MATCHING ---
                const match = findBestMatch(title, brand, dbProducts);
                let productId = match?.product.id;
                let existingTags = match?.product.tags || [];

                console.log(`   --------------------------------------------------`);
                console.log(`   [${i + 1}/${productCards.length}] 📦 ${title}`);
                
                if (match) {
                    console.log(`      🔗 MATCHED: "${match.product.title}" (Score: ${(match.score*100).toFixed(0)}%)`);
                } else {
                    console.log(`      ✨ NO MATCH: Creating Skeleton (PENDING ENRICHMENT)`);
                }
                console.log(`      💰 $${price} | Reg: $${originalPrice}`);

                // --- DB SAVE ---
                await prisma.$transaction(async (tx) => {
                    let logMsg = "";
                    
                    // 1. Create Skeleton or Update
                    if (!productId) {
                        const newSlug = slugify(title, { lower: true, strict: true });
                        const newProduct = await tx.product.create({
                            data: {
                                title, slug: newSlug, 
                                image: null, // No Image
                                description: "PENDING", // Flag for Enrichment Script
                                brand, category, tags: [category]
                            }
                        });
                        productId = newProduct.id;
                        dbProducts.push({ id: newProduct.id, title, slug: newSlug, tags: [category], brand, image: null });
                        logMsg += "Created Skeleton | ";
                    } else {
                        // Just enrich tags if needed
                        if (category !== "Plugin" && !existingTags.includes(category)) {
                            await tx.product.update({ where: { id: productId }, data: { tags: { push: category } } });
                        }
                    }

                    // 2. Manage Listing (Prevent Duplicates)
                    const existingListing = await tx.listing.findFirst({
                        where: { retailerId: retailer.id, productId: productId }
                    });

                    let listingId = existingListing?.id;
                    let priceChanged = true;

                    if (existingListing) {
                        await tx.listing.update({
                            where: { id: existingListing.id },
                            data: { price, originalPrice, url: link, lastScraped: new Date() }
                        });
                        listingId = existingListing.id;
                        priceChanged = existingListing.price !== price;
                        logMsg += "Updated Listing | ";
                    } else {
                        const newListing = await tx.listing.create({
                            data: { url: link, title, price, originalPrice, retailerId: retailer.id, productId: productId! }
                        });
                        listingId = newListing.id;
                        logMsg += "New Listing | ";
                    }

                    // 3. Save History (Only if changed)
                    if (priceChanged && listingId) {
                        await tx.priceHistory.create({ data: { listingId: listingId, price } });
                        console.log(`      ✅ DB: ${logMsg}History Saved.`);
                    } else {
                        console.log(`      ✅ DB: ${logMsg}Price Unchanged.`);
                    }
                });
            }

            const clickedNext = await clickLoadMoreAndWait(page, productCards.length);
            if (clickedNext) {
                pageNum++;
                await page.evaluate(() => window.scrollBy(0, 200)); 
            } else {
                hasNextPage = false;
            }
        }
        console.log(`\n✅ SCRAPE COMPLETE!`);
    } catch (e: any) {
        console.error("❌ Critical Error:", e.message);
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

startScrape();