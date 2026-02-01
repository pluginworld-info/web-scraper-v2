import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import fs from 'fs'; 
import path from 'path';
import { prisma } from '../../src/lib/db/prisma'; 
import { RetailerRole } from '@prisma/client';
import { getSimilarity } from '../utils/fuzzy-match';
// ✅ ADDED: Image Uploader Import
import { processAndUploadImage } from '../utils/image-uploader';

puppeteer.use(StealthPlugin());

// CONFIG
const BASE_URL = 'https://audiodeluxe.com/collections/software?filter.v.price.gte=&filter.v.price.lte=&filter.p.m.custom.hot_deals=Exclusive+Deal&filter.p.m.custom.hot_deals=On+Sale+Now&sort_by=manual';
const RETAILER_NAME = "AudioDeluxe";
const RETAILER_DOMAIN = "audiodeluxe.com";
const RETAILER_LOGO = "https://audiodeluxe.com/cdn/shop/files/AudioDeluxe_Logo_2023_Black_400x.png"; // Official Logo
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

// HELPERS
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const humanDelay = async (min = 1000, max = 3000) => {
    const ms = randomInt(min, max);
    await new Promise(r => setTimeout(r, ms));
};

// Safe Price Parser (Handles text fallback)
const parsePrice = (text: string) => {
    if (!text) return 0;
    const cleanText = text.replace(/[^0-9.]/g, '').trim(); 
    const match = cleanText.match(/(\d+\.?\d{0,2})/); 
    return match ? parseFloat(match[0]) : 0;
};

// 1. COOKIE BANNER KILLER
async function closeCookieBanner(page: any) {
    try {
        const bannerSelectors = [
            '#osano-cm-accept-all',
            '.osano-cm-accept-all',
            'button[class*="cookie"]',
            '#accept-cookies'
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

async function randomMouseMoves(page: any) {
    try {
        const mouse = page.mouse;
        await mouse.move(randomInt(300, 1500), randomInt(300, 900), { steps: randomInt(10, 25) });
    } catch(e) {}
}

// 2. ROBUST LOAD MORE (Targeting specific AD class)
async function clickLoadMoreAndWait(page: any, previousCount: number): Promise<boolean> {
    console.log("   🔎 Looking for 'Load More' button...");

    const buttonHandle = await page.evaluateHandle(() => {
        // Target the specific span/a combo from your source
        const btn = document.querySelector('.js-load-more a');
        if (btn) return btn;
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
            
            // Shopify "Load More" usually triggers AJAX or Navigation. 
            // We force a click and wait.
            await buttonElement.click(); 
            console.log("   🖱️ Click sent. Waiting for content...");

            try {
                await page.waitForFunction((prev: number) => {
                    const count = document.querySelectorAll('.thumbnail, .product-wrap').length;
                    return count > prev; 
                }, { timeout: 15000 }, previousCount);
                return true;
            } catch (e) {
                console.log("   ⚠️ Clicked, but product count didn't increase (Timeout).");
                return false; 
            }
        } catch (e: any) {
            console.log(`   ⚠️ Click failed: ${e.message}`);
            // Force JS Click
            await page.evaluate((el: any) => el.click(), buttonHandle);
            await humanDelay(4000, 6000);
            return true;
        }
    }
    
    return false;
}

async function startScrape() {
    console.log(`🚀 STARTING ${RETAILER_NAME} CRAWL (JSON Data + Images + Brand Fix)`);

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
        // ✅ UPDATED: Select 'brand' for matching fix
        const existingProducts = await prisma.product.findMany({ 
            select: { id: true, title: true, slug: true, tags: true, brand: true } 
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
            const productCards = $('.thumbnail, .product-wrap'); // Broad selectors for grid items

            if (productCards.length === 0) {
                console.log("   ❌ No products found on this page.");
                break;
            }

            console.log(`   ✅ Found ${productCards.length} visible products.`);
            let newItemsInBatch = 0;

            for (const el of productCards) {
                const $el = $(el);
                
                // 1. Title & Link
                let title = $el.find('.title, .product-title').first().text().trim();
                let link = $el.find('a').attr('href');
                
                if (!title || !link) continue;
                if (link.startsWith('/')) link = `https://www.audiodeluxe.com${link}`;

                if (processedUrls.has(link)) continue;
                processedUrls.add(link);
                newItemsInBatch++;

                // 2. DATA EXTRACTION via JSON (The Gold Mine)
                let brand = "Unknown";
                let category = "Plugin";
                let price = 0;
                let originalPrice = 0;
                let imgRaw: string | undefined = undefined; // ✅ ADDED: Image var

                const jsonDiv = $el.find('[data-product]');
                if (jsonDiv.length > 0) {
                    try {
                        const jsonData = JSON.parse(jsonDiv.attr('data-product') || '{}');
                        
                        // Extract from JSON
                        if (jsonData.vendor) brand = jsonData.vendor;
                        if (jsonData.type) category = jsonData.type;
                        // Shopify uses cents (1000 = $10.00)
                        if (jsonData.price) price = jsonData.price / 100;
                        if (jsonData.compare_at_price) originalPrice = jsonData.compare_at_price / 100;
                        
                        // ✅ ADDED: Extract Image from JSON
                        if (jsonData.featured_image) imgRaw = jsonData.featured_image;

                    } catch (e) {}
                }

                // 3. Fallback Extraction (If JSON was missing/broken)
                if (price === 0) {
                    price = parsePrice($el.find('.price--sale .money, .price .money').text());
                }
                if (originalPrice === 0) {
                    originalPrice = parsePrice($el.find('.compare-at-price .money').text());
                }
                if (brand === "Unknown") {
                    brand = $el.find('.vendor, .product-vendor').text().trim() || "Unknown";
                }
                // ✅ ADDED: Fallback Image Selector
                if (!imgRaw) {
                    imgRaw = $el.find('img').attr('data-src') || $el.find('img').attr('src');
                }
                // Fix relative URLs
                if (imgRaw && imgRaw.startsWith('//')) imgRaw = `https:${imgRaw}`;

                // Normalize
                if (originalPrice === 0 || originalPrice < price) originalPrice = price;
                
                const rawSlug = slugify(title, { lower: true, strict: true });

                console.log(`   -------------------------------------------------`);
                console.log(`   🔍 PROCESSING: ${title}`);
                console.log(`      - Price: $${price} (Reg: $${originalPrice})`);
                console.log(`      - Brand: ${brand} | Cat: ${category}`);

                // Matching & Saving
                let matchId: string | null = null;
                let existingTags: string[] = [];
                let existingBrand = "Unknown"; // ✅ ADDED: Store DB brand

                const exactMatch = existingProducts.find(p => p.slug === rawSlug);

                if (exactMatch) {
                    matchId = exactMatch.id;
                    existingTags = exactMatch.tags;
                    existingBrand = exactMatch.brand || "Unknown"; // ✅ ADDED
                    console.log(`      🔗 MATCHED: Exact Slug`);
                } else {
                    let bestScore = 0;
                    for (const p of existingProducts) {
                        const score = getSimilarity(title, p.title);
                        if (score > bestScore) {
                            bestScore = score;
                            matchId = p.id;
                            existingTags = p.tags;
                            existingBrand = p.brand || "Unknown"; // ✅ ADDED
                        }
                    }
                    if (bestScore > 0.85) console.log(`      🔗 MATCHED: Fuzzy (${(bestScore*100).toFixed(0)}%)`);
                    else matchId = null;
                }

                // ✅ ADDED: Brand Fix Logic
                if (brand === "Unknown" && existingBrand !== "Unknown") {
                    brand = existingBrand;
                    console.log(`      🏷️ Inherited Brand from DB: ${brand}`);
                }

                await prisma.$transaction(async (tx) => {
                    let productId = matchId;
                    let finalImage = null;

                    // ✅ ADDED: Upload Image ONLY if creating a NEW product (Skeleton)
                    if (!productId && imgRaw) {
                        if (fs.existsSync(KEY_PATH)) {
                            try {
                                finalImage = await processAndUploadImage(imgRaw, rawSlug);
                            } catch (e) {
                                // Silent fail
                            }
                        }
                    }

                    if (!productId) {
                        console.log(`      ✨ CREATING NEW SKELETON`);
                        const newProduct = await tx.product.create({
                            data: {
                                title, slug: rawSlug, 
                                image: finalImage, // ✅ SAVE IMAGE
                                description: `Found on ${RETAILER_NAME}`,
                                brand, category, tags: [category]
                            }
                        });
                        productId = newProduct.id;
                        existingProducts.push({ id: newProduct.id, title, slug: rawSlug, tags: [category], brand });
                        totalCreated++;
                    } else {
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

            // Click Load More
            const clickedNext = await clickLoadMoreAndWait(page, productCards.length);
            if (clickedNext) {
                pageNum++;
                await page.evaluate(() => window.scrollBy(0, 300)); 
            } else {
                console.log("   ✅ No 'Load More' button found or End of List. Crawl Complete.");
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