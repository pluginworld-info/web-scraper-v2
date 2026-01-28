import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import fs from 'fs'; 
import path from 'path';
import { prisma } from '../src/lib/db/prisma'; 
import { RetailerRole } from '@prisma/client';
import { processAndUploadImage } from './utils/image-uploader';

// 1. Enable Stealth Mode
puppeteer.use(StealthPlugin());

// CONFIG
const TARGET_DOMAIN = 'audioplugin.deals'; 
const BASE_URL = 'https://audioplugin.deals/shop/';
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

// HELPER: Random Integer
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ✅ NEW: The "Humanizer" Function (Replaces simple humanDelay)
const sleepWithJitter = (minDelay: number) => {
  // Random jitter between 0 and 5000ms (0 to 5 seconds) added to the base delay
  const jitter = Math.floor(Math.random() * 5000); 
  const totalDelay = minDelay + jitter;
  
  // Only log if the delay is significant (ignores small UI delays)
  if (totalDelay > 2000) {
    console.log(`      💤 Cooling down for ${(totalDelay/1000).toFixed(1)}s...`);
  }
  
  return new Promise(resolve => setTimeout(resolve, totalDelay));
};

// HELPER: Mouse Jitter
async function randomMouseMoves(page: any) {
    const mouse = page.mouse;
    const width = 1920;
    const height = 1080;
    for (let i = 0; i < randomInt(2, 4); i++) {
        const x = randomInt(100, width - 100);
        const y = randomInt(100, height - 100);
        await mouse.move(x, y, { steps: randomInt(10, 30) });
        if (Math.random() > 0.6) await sleepWithJitter(500); // Small micro-pauses
    }
}

// HELPER: Deep Scrape (Aggressive Cleaning)
async function deepScrapeDetails(browser: any, url: string) {
    let description = "";
    let category = "Plugin"; 

    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
            if (['font', 'media', 'stylesheet', 'image'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const content = await page.content();
        const $ = cheerio.load(content);

        // 1. TARGETED SELECTION
        const descContainer = $('#tab-description');
        
        if (descContainer.length > 0) {
            description = descContainer.find('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
        }

        if (!description || description.length < 50) {
            description = $('.elementor-widget-text-editor').first().text().trim();
        }

        // 2. TEXT CLEANING
        description = description
            .replace(/Subscribe« Prev1 \/ 1Next »/g, '')
            .replace(/« Prev/g, '')
            .replace(/Next »/g, '')
            .replace(/Click here to.*/g, '')
            .replace(/OverviewVideo.*/g, '')
            .trim();

        description = description.substring(0, 2000); 

        // 3. Get Category
        const catText = $('.posted_in').text(); 
        if (catText.includes(':')) category = catText.split(':')[1].trim();

        await page.close();

    } catch (e) {
        // console.warn(`      ⚠️ Deep scrape failed for ${url}`);
    }

    return { description, category };
}

// HELPER: Infinite Scroll Engine
async function infiniteScrollAndScrape(page: any, browser: any, retailerId: string, scrapeDelay: number) {
    console.log("   📜 Starting Infinite Scroll Engine...");
    
    let previousHeight = 0;
    let sameHeightCount = 0;
    let totalProductsFound = 0;
    const processedUrls = new Set<string>();

    while (true) {
        const distance = randomInt(600, 900);
        await page.evaluate((y: number) => window.scrollBy(0, y), distance);
        
        // Use the DB delay between major scrolls
        await sleepWithJitter(2000); 

        // Scrape Visible
        const count = await scrapeVisibleProducts(page, browser, retailerId, processedUrls, scrapeDelay);
        totalProductsFound = count; 

        const metrics = await page.evaluate(() => ({
            scrollHeight: document.body.scrollHeight,
            scrollY: window.scrollY,
            innerHeight: window.innerHeight
        }));

        const currentBottom = metrics.scrollY + metrics.innerHeight;

        if (currentBottom >= metrics.scrollHeight - 100) {
            if (metrics.scrollHeight === previousHeight) {
                sameHeightCount++;
                console.log(`      ⏳ Waiting for load... (${sameHeightCount}/4)`);
                if (sameHeightCount >= 4) {
                    console.log("      ✅ Page stopped growing. Infinite Scroll Complete.");
                    break; 
                }
            } else {
                console.log("      ⬇️ New content loaded! Continuing...");
                sameHeightCount = 0;
            }
            previousHeight = metrics.scrollHeight;
        }
    }
    return totalProductsFound;
}

// CORE SCRAPER FUNCTION
async function scrapeVisibleProducts(page: any, browser: any, retailerId: string, processedUrls: Set<string>, scrapeDelay: number) {
    const content = await page.content();
    const $ = cheerio.load(content);
    const products = $('.jet-listing-grid__item');

    if (products.length === 0) return processedUrls.size;

    for (const el of products) {
        const $el = $(el);

        const btn = $el.find('a.cart-button'); 
        let title = btn.attr('data-product-title') || btn.attr('data-product_title');
        let link = $el.find('h6.elementor-heading-title a').attr('href');
        
        let imgRaw = $el.find('.elementor-widget-image img').attr('data-src') || 
                     $el.find('.elementor-widget-image img').attr('src');

        if (!title) title = $el.find('h6.elementor-heading-title').text().trim();

        // 1. GET SALE PRICE
        let priceRaw = btn.attr('data-base-price') || btn.attr('data-price');
        if (!priceRaw) {
             const priceText = $el.find('.apd-listing-base-price').text();
             priceRaw = priceText.replace(/[^0-9.]/g, '');
        }
        const price = parseFloat(priceRaw || '0');

        // 2. 🔴 GET ORIGINAL PRICE (The Strikethrough Price)
        let originalPriceRaw = 
            $el.find('del .woocommerce-Price-amount').text() || // Standard Woo
            $el.find('.price del').text() ||                    // Generic
            $el.find('.elementor-widget-heading del').text();   // Elementor

        // Clean the text
        originalPriceRaw = originalPriceRaw.replace(/[^0-9.]/g, '');
        let originalPrice = parseFloat(originalPriceRaw);

        // Fallback: If no original price, or it's smaller than sale price (logic error), 
        // treat original as same as sale price
        if (isNaN(originalPrice) || originalPrice < price) {
            originalPrice = price; 
        }

        if (!title || !link) continue;
        if (link.startsWith('/')) link = `https://audioplugin.deals${link}`;

        if (processedUrls.has(link)) continue;
        processedUrls.add(link);

        const slug = slugify(title, { lower: true, strict: true });
        
        // Parse Brand
        let brand = "Unknown";
        let cleanTitle = title;
        if (title.toLowerCase().includes(" by ")) {
            const parts = title.split(/ by /i);
            cleanTitle = parts[0].trim();
            brand = parts[1].trim();
        }

        // --- DEEP SCRAPE LOGIC ---
        const existingProduct = await prisma.product.findUnique({ where: { slug } });
        
        let description = existingProduct?.description || "";
        let category = existingProduct?.category || "Plugin";
        
        const isGarbageDesc = !description || description.includes("Subscribe") || description === "Imported from APD";

        if (isGarbageDesc) {
            console.log(`      🕵️ Fixing Description: ${cleanTitle}`);
            const details = await deepScrapeDetails(browser, link);
            if (details.description && details.description.length > 20) {
                description = details.description;
            }
            if (details.category) category = details.category;

            // Wait after deep scrape
            await sleepWithJitter(scrapeDelay);
        }

        // --- IMAGE LOGIC ---
        let finalImage = existingProduct?.image;
        
        if ((!finalImage || finalImage === 'null') && imgRaw) {
             if (fs.existsSync(KEY_PATH)) {
                 process.stdout.write(`      📥 Uploading Image... `); 
                 try {
                    finalImage = await processAndUploadImage(imgRaw, slug);
                    console.log("Done.");
                 } catch (err) {
                    console.log("Failed.");
                 }
             }
        }

        if (isGarbageDesc || !existingProduct) {
            console.log(`      👉 UPDATING: ${cleanTitle} | $${price} (Reg: $${originalPrice})`);
        }

        // --- DATABASE SAVE ---
        await prisma.$transaction(async (tx) => {
            const product = await tx.product.upsert({
                where: { slug },
                update: { 
                    title: cleanTitle, 
                    description, 
                    brand,
                    category,
                    image: finalImage,
                    updatedAt: new Date() 
                },
                create: {
                    title: cleanTitle,
                    slug,
                    image: finalImage,
                    description: description || "No description available",
                    brand,
                    category,
                    tags: [category]
                }
            });

            const listing = await tx.listing.upsert({
                where: { url: link },
                update: { 
                    price, 
                    originalPrice, // Saving Original Price
                    lastScraped: new Date() 
                },
                create: {
                    url: link, 
                    title, 
                    price, 
                    originalPrice, // Saving Original Price
                    retailerId: retailerId, 
                    productId: product.id 
                }
            });

            await tx.priceHistory.create({
                data: { listingId: listing.id, price }
            });
        });
    }
    
    return processedUrls.size;
}

async function startMasterCrawl() {
    console.log(`🚀 STARTING V3 MASTER CRAWL (Garbage Collector Edition)`);
    console.log(`   Target: ${BASE_URL}`);

    if (!fs.existsSync(KEY_PATH)) {
        console.error("   ❌ ERROR: 'service-account.json' missing from ROOT.");
        return;
    }

    const retailer = await prisma.retailer.upsert({
        where: { name: "Audio Plugin Deals" },
        update: {},
        create: {
            name: "Audio Plugin Deals",
            domain: TARGET_DOMAIN,
            role: RetailerRole.MASTER,
            scrapeDelay: 5000 // Default value
        }
    });

    console.log(`   ⏱️ Scrape Delay set to: ${retailer.scrapeDelay}ms + Jitter`);

    const browser = await puppeteer.launch({
        headless: false, 
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({ 'Referer': 'https://www.google.com/', 'Accept-Language': 'en-US,en;q=0.9' });

        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await randomMouseMoves(page);
        
        const total = await infiniteScrollAndScrape(page, browser, retailer.id, retailer.scrapeDelay);

        console.log(`   ✅ DONE! Total Products: ${total}`);

    } catch (error: any) {
        console.error("❌ Critical Error:", error.message);
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

startMasterCrawl();