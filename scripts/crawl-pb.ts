import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import fs from 'fs'; 
import path from 'path';
import { prisma } from '../src/lib/db/prisma'; 
import { RetailerRole } from '@prisma/client';
import { getSimilarity } from './utils/fuzzy-match';

puppeteer.use(StealthPlugin());

// CONFIG
const BASE_URL = 'https://www.pluginboutique.com/deals';
const RETAILER_NAME = "Plugin Boutique";
const RETAILER_DOMAIN = "pluginboutique.com";
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

// HELPERS
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const humanDelay = async (min = 1000, max = 3000) => {
    const ms = randomInt(min, max);
    await new Promise(r => setTimeout(r, ms));
};

async function randomMouseMoves(page: any) {
    const mouse = page.mouse;
    await mouse.move(randomInt(100, 1800), randomInt(100, 800), { steps: 10 });
}

// HELPER: "Load More" / "Next" Clicker
async function clickLoadMore(page: any): Promise<boolean> {
    console.log("   🔎 Looking for 'Next' or 'Load More' button...");

    // Try multiple selectors: .next_page (PB standard), .next (common), or specific text
    const clicked = await page.evaluate(async () => {
        const buttons = Array.from(document.querySelectorAll('a, button, .pagination a'));
        const nextBtn = buttons.find(el => {
            const text = (el.textContent || '').toLowerCase();
            return text.includes('next') || text.includes('load more') || el.classList.contains('next_page');
        });

        if (nextBtn) {
            (nextBtn as HTMLElement).click();
            return true;
        }
        return false;
    });

    if (clicked) {
        console.log("   🖱️ Clicked button. Waiting for load...");
        await new Promise(r => setTimeout(r, 4000)); 
        return true;
    }
    
    return false;
}

async function startScrape() {
    console.log(`🚀 STARTING ${RETAILER_NAME} CRAWL (Price & Title Only)`);

    if (!fs.existsSync(KEY_PATH)) {
        console.error("   ❌ ERROR: 'service-account.json' missing from root.");
        return;
    }

    // 1. Setup Retailer
    const retailer = await prisma.retailer.upsert({
        where: { name: RETAILER_NAME },
        update: {},
        create: {
            name: RETAILER_NAME,
            domain: RETAILER_DOMAIN,
            role: RetailerRole.PRICE_CHECKER,
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plugin_Boutique_Logo.png/640px-Plugin_Boutique_Logo.png" 
        }
    });

    const browser = await puppeteer.launch({
        headless: false, 
        defaultViewport: null,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--window-size=1920,1080',
            '--disable-features=AudioService,OutOfBlinkCors', 
            '--no-first-run', 
            '--disable-notifications', 
            '--mute-audio'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        await page.setExtraHTTPHeaders({ 'Referer': 'https://www.google.com/', 'Accept-Language': 'en-US,en;q=0.9' });

        console.log(`   🏠 Navigating to ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await humanDelay(2000, 4000);

        // 2. Load Existing Products (For Matching)
        console.log("   🧠 Loading database for matching...");
        const existingProducts = await prisma.product.findMany({ 
            select: { id: true, title: true, slug: true } 
        });
        console.log(`      Loaded ${existingProducts.length} products.`);

        let hasNextPage = true;
        let pageNum = 1;

        while (hasNextPage) {
            console.log(`\n📄 Processing Page ${pageNum}...`);
            await randomMouseMoves(page);

            const content = await page.content();
            const $ = cheerio.load(content);
            const productCards = $('div[data-controller="product-tile"]');

            if (productCards.length === 0) {
                console.log("   ❌ No products found on this page.");
                break;
            }

            console.log(`   ✅ Found ${productCards.length} products visible.`);

            for (const el of productCards) {
                const $el = $(el);

                let title = $el.find('[data-testid^="product-name-"]').text().trim();
                let link = $el.find('a[data-product-tile-target="mainLink"]').attr('href');
                
                // --- PRICE PARSING ---
                // Sale Price (Current)
                let priceText = $el.find('.text-right.text-gray-900.text-base.font-semibold').first().text().trim();
                const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

                // Original Price (Strikethrough - Looking for <del> or .line-through classes)
                let originalPriceText = $el.find('.line-through').text() || $el.find('del').text();
                let originalPrice = parseFloat(originalPriceText.replace(/[^0-9.]/g, '')) || 0;

                // Fallback: If no original price found, assume it equals sale price
                if (originalPrice === 0 || originalPrice < price) {
                    originalPrice = price;
                }

                if (!title || !link) continue;
                if (!link.startsWith('http')) link = `https://www.pluginboutique.com${link}`;
                
                const rawSlug = slugify(title, { lower: true, strict: true });

                // --- MATCHING LOGIC ---
                let matchId: string | null = null;
                let matchType = "NONE";

                const exactMatch = existingProducts.find(p => p.slug === rawSlug);
                if (exactMatch) {
                    matchId = exactMatch.id;
                    matchType = "EXACT";
                } else {
                    let bestScore = 0;
                    for (const p of existingProducts) {
                        const score = getSimilarity(title, p.title);
                        if (score > bestScore) {
                            bestScore = score;
                            matchId = p.id;
                        }
                    }
                    if (bestScore > 0.85) matchType = "FUZZY";
                    else matchId = null;
                }

                if (matchId) {
                    // console.log(`      🔗 LINKING: ${title} -> Existing (${matchType})`);
                } else {
                    // console.log(`      ✨ NEW SKELETON: ${title}`);
                }

                // --- SAVE ---
                await prisma.$transaction(async (tx) => {
                    let productId = matchId;

                    // If New: Create Skeleton Product (Title Only)
                    if (!productId) {
                        const newProduct = await tx.product.create({
                            data: {
                                title,
                                slug: rawSlug,
                                image: null, // Spokes don't provide images
                                description: "Description pending...",
                                brand: "Unknown",
                                category: "Plugin",
                                tags: ["Plugin"]
                            }
                        });
                        productId = newProduct.id;
                        existingProducts.push({ id: newProduct.id, title, slug: rawSlug });
                    }

                    // Update/Create Listing with Original Price
                    await tx.listing.upsert({
                        where: { url: link },
                        update: { 
                            price, 
                            originalPrice, // Updating the Discount logic
                            lastScraped: new Date(), 
                            productId 
                        },
                        create: {
                            url: link, 
                            title, 
                            price, 
                            originalPrice, // Creating with Discount logic
                            retailerId: retailer.id, 
                            productId: productId! 
                        }
                    });

                    // Update History
                    const listing = await tx.listing.findUnique({ where: { url: link } });
                    if (listing) {
                        await tx.priceHistory.create({ data: { listingId: listing.id, price } });
                    }
                });
            }

            // 2. Handle "Load More" / "Next Page"
            const clickedNext = await clickLoadMore(page);
            
            if (clickedNext) {
                pageNum++;
                await page.evaluate(() => window.scrollBy(0, -100)); 
            } else {
                console.log("   ✅ No 'Next' button found. Crawl Complete.");
                hasNextPage = false;
            }
        }

    } catch (e: any) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

startScrape();