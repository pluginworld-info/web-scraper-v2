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

puppeteer.use(StealthPlugin());

// CONFIG
const BASE_URL = 'https://www.pluginboutique.com/deals';
const RETAILER_NAME = "Plugin Boutique";
const RETAILER_DOMAIN = "pluginboutique.com";
const RETAILER_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plugin_Boutique_Logo.png/640px-Plugin_Boutique_Logo.png";
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

// 🚨 FORCE SETTING: Always update DB even if data looks similar
const FORCE_REFRESH_PRICES = true;

// HELPERS
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const humanDelay = async (min = 1000, max = 3000) => {
    const ms = randomInt(min, max);
    await new Promise(r => setTimeout(r, ms));
};

// Robust Price Parser
const parsePrice = (text: string) => {
    if (!text) return 0;
    const cleanText = text.split('(')[0].replace(/[^0-9.]/g, '').trim(); 
    const match = cleanText.match(/(\d+\.?\d{0,2})/); 
    return match ? parseFloat(match[0]) : 0;
};

// 1. COOKIE BANNER KILLER
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
                await humanDelay(1000, 2000);
                return;
            }
        }
    } catch (e) {}
}

// 2. SCROLL MONITOR & MOUSE JITTER
async function randomMouseMoves(page: any) {
    try {
        const mouse = page.mouse;
        await mouse.move(randomInt(300, 1500), randomInt(300, 900), { steps: randomInt(10, 25) });
    } catch(e) {}
}

// 3. ROBUST LOAD MORE
async function clickLoadMoreAndWait(page: any, previousCount: number): Promise<boolean> {
    console.log("   🔎 Looking for 'Load More' button...");

    const buttonHandle = await page.evaluateHandle(() => {
        const btn = document.querySelector('[data-testid="search-load-more-btn"]');
        if (btn) return btn;
        const container = document.querySelector('#search-load-more a');
        if (container) return container;
        return null; 
    });

    const buttonElement = buttonHandle.asElement();

    if (buttonElement) {
        try {
            console.log("   🖱️ Button found. Scrolling into view...");
            await page.evaluate((el: any) => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, buttonHandle);
            
            await humanDelay(1000, 2000);
            await randomMouseMoves(page);
            await buttonElement.click(); 
            console.log("   🖱️ Click sent. Waiting for content load...");

            try {
                await page.waitForFunction((prev: number) => {
                    const count = document.querySelectorAll('div[data-controller="product-tile"]').length;
                    return count > prev; 
                }, { timeout: 15000 }, previousCount);
                return true;
            } catch (e) {
                console.log("   ⚠️ Clicked, but product count didn't increase (Timeout).");
                return false; 
            }
        } catch (e: any) {
            console.log(`   ⚠️ Click interaction failed: ${e.message}`);
            await page.evaluate((el: any) => el.click(), buttonHandle);
            await humanDelay(4000, 6000);
            return true;
        }
    } else {
        console.log("   ❌ 'Load More' button not found in DOM (End of results?).");
    }
    return false;
}

async function startScrape() {
    console.log(`🚀 STARTING ${RETAILER_NAME} CRAWL (BACKFILL IMAGES MODE)`);

    if (!fs.existsSync(KEY_PATH)) {
        console.error("   ❌ ERROR: 'service-account.json' missing from root.");
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
        await page.setExtraHTTPHeaders({ 'Referer': 'https://www.google.com/', 'Accept-Language': 'en-US,en;q=0.9' });

        console.log(`   🏠 Navigating to ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await closeCookieBanner(page);
        await humanDelay(2000, 4000);

        console.log("   🧠 Loading database for matching...");
        // ✅ UPDATED: Fetch 'image' to check if it's missing
        const existingProducts = await prisma.product.findMany({ 
            select: { id: true, title: true, slug: true, tags: true, brand: true, image: true } 
        });
        console.log(`      Loaded ${existingProducts.length} products.`);

        let hasNextPage = true;
        let pageNum = 1;
        let totalUpdated = 0;
        let totalCreated = 0;
        const processedUrls = new Set<string>();

        while (hasNextPage) {
            console.log(`\n📄 Processing Batch ${pageNum}...`);
            await randomMouseMoves(page);

            const content = await page.content();
            const $ = cheerio.load(content);
            const productCards = $('div[data-controller="product-tile"]');

            if (productCards.length === 0) break;

            console.log(`   ✅ Found ${productCards.length} visible products.`);
            let newItemsInBatch = 0;

            for (const el of productCards) {
                const $el = $(el);
                let title = $el.find('[data-testid^="product-name-"]').text().trim();
                let link = $el.find('a[data-product-tile-target="mainLink"]').attr('href');
                
                if (!title || !link) continue;
                if (link.startsWith('/')) link = `https://www.pluginboutique.com${link}`;

                if (processedUrls.has(link)) continue;
                processedUrls.add(link);
                newItemsInBatch++;

                // --- DATA EXTRACTION ---
                let brand = $el.find('a[data-product-tile-target="manufacturerLink"]').text().trim() || "Unknown";
                let category = $el.find('a[data-product-tile-target="categoryLink"]').text().trim() || "Plugin";
                
                // ✅ EXTRACT IMAGE
                let imgRaw = $el.find('img').attr('src') || $el.find('img').attr('data-src');

                let originalPrice = parsePrice($el.find('.line-through').text());
                let priceText = $el.find('.mt-auto .text-gray-900.text-base.font-semibold:not(.truncate)').text();
                const price = parsePrice(priceText);

                if (originalPrice === 0 || originalPrice < price) originalPrice = price;
                
                const rawSlug = slugify(title, { lower: true, strict: true });

                console.log(`   -------------------------------------------------`);
                console.log(`   🔍 PROCESSING: ${title}`);
                console.log(`      - Found Image: ${imgRaw ? 'Yes' : 'No'}`); // ✅ LOG IT
                console.log(`      - Price: $${price} (Reg: $${originalPrice})`);

                // Matching & Saving
                let matchId: string | null = null;
                let existingTags: string[] = [];
                let existingBrand = "Unknown";
                let hasImageInDB = false;

                const exactMatch = existingProducts.find(p => p.slug === rawSlug);

                if (exactMatch) {
                    matchId = exactMatch.id;
                    existingTags = exactMatch.tags;
                    existingBrand = exactMatch.brand || "Unknown";
                    hasImageInDB = !!exactMatch.image; // Check if DB has image
                    console.log(`      🔗 MATCHED: Exact Slug (Has Image: ${hasImageInDB ? 'Yes' : 'No'})`);
                } else {
                    let bestScore = 0;
                    for (const p of existingProducts) {
                        const score = getSimilarity(title, p.title);
                        if (score > bestScore) {
                            bestScore = score;
                            matchId = p.id;
                            existingTags = p.tags;
                            existingBrand = p.brand || "Unknown";
                            hasImageInDB = !!p.image;
                        }
                    }
                    if (bestScore > 0.85) console.log(`      🔗 MATCHED: Fuzzy (${(bestScore*100).toFixed(0)}%)`);
                    else matchId = null;
                }

                if (brand === "Unknown" && existingBrand !== "Unknown") {
                    brand = existingBrand;
                }

                await prisma.$transaction(async (tx) => {
                    let productId = matchId;
                    let finalImage = null;

                    // ✅ SMART UPLOAD: Upload if New OR if Existing has NO Image
                    if ((!productId || !hasImageInDB) && imgRaw) {
                        if (fs.existsSync(KEY_PATH)) {
                            process.stdout.write(`      📥 Uploading Image (Backfill)... `);
                            try {
                                finalImage = await processAndUploadImage(imgRaw, rawSlug);
                                console.log("Done.");
                            } catch (e) {
                                console.log("Failed.");
                            }
                        }
                    }

                    if (!productId) {
                        console.log(`      ✨ CREATING NEW SKELETON`);
                        const newProduct = await tx.product.create({
                            data: {
                                title, slug: rawSlug, 
                                image: finalImage, 
                                description: `Found on ${RETAILER_NAME}`,
                                brand, category, tags: [category]
                            }
                        });
                        productId = newProduct.id;
                        existingProducts.push({ id: newProduct.id, title, slug: rawSlug, tags: [category], brand, image: finalImage });
                        totalCreated++;
                    } else {
                        // UPDATE EXISTING
                        console.log(`      ♻️  REFRESHING EXISTING LISTING...`);
                        
                        // Backfill Image if missing
                        if (!hasImageInDB && finalImage) {
                            console.log(`      🖼️  BACKFILLING MISSING IMAGE`);
                            await tx.product.update({
                                where: { id: productId },
                                data: { image: finalImage }
                            });
                            // Update local cache
                            const pIndex = existingProducts.findIndex(p => p.id === productId);
                            if (pIndex > -1) existingProducts[pIndex].image = finalImage;
                        }

                        if (category !== "Plugin" && !existingTags.includes(category)) {
                            console.log(`      🏷️ ENRICHING TAGS: +${category}`);
                            await tx.product.update({
                                where: { id: productId },
                                data: { tags: { push: category } }
                            });
                            existingTags.push(category); 
                        }
                        totalUpdated++;
                    }

                    await tx.listing.upsert({
                        where: { url: link },
                        update: { price, originalPrice, lastScraped: new Date(), productId },
                        create: {
                            url: link, title, price, originalPrice, 
                            retailerId: retailer.id, productId: productId! 
                        }
                    });

                    const listing = await tx.listing.findUnique({ where: { url: link } });
                    if (listing) {
                        await tx.priceHistory.create({ data: { listingId: listing.id, price } });
                    }
                });
            }

            const clickedNext = await clickLoadMoreAndWait(page, productCards.length);
            if (clickedNext) {
                pageNum++;
                await page.evaluate(() => window.scrollBy(0, 200)); 
            } else {
                console.log("   ✅ No 'Next/Load More' button found. Crawl Complete.");
                hasNextPage = false;
            }
        }

        console.log(`\n✅ SCRAPE COMPLETE!`);
        console.log(`   - New Products Created: ${totalCreated}`);
        console.log(`   - Existing Products Updated: ${totalUpdated}`);

    } catch (e: any) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

startScrape();