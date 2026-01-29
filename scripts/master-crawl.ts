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

// HELPER: Humanizer Delay
const sleepWithJitter = (minDelay: number) => {
  const jitter = Math.floor(Math.random() * 5000); 
  const totalDelay = minDelay + jitter;
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
        if (Math.random() > 0.6) await sleepWithJitter(500); 
    }
}

// HELPER: Deep Scrape (Targeted for APD Page Structure)
async function deepScrapeDetails(browser: any, url: string) {
    let description = "";
    let category = "Plugin"; 
    let brand = "Unknown";
    let originalPrice = 0;
    let highResImage = null;

    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
            // Allow images here because we want to catch the high-res URL if possible
            if (['font', 'media', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const content = await page.content();
        const $ = cheerio.load(content);

        // 1. EXTRACT DESCRIPTION
        // Targeted Selector based on your HTML: .woocommerce-product-details__short-description
        const descContainer = $('.woocommerce-product-details__short-description');
        if (descContainer.length > 0) {
            description = descContainer.find('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
        } else {
             // Fallback
            description = $('#tab-description').text().trim();
        }

        // Clean Description
        description = description
            .replace(/Subscribe« Prev1 \/ 1Next »/g, '')
            .replace(/Click here to.*/g, '')
            .trim()
            .substring(0, 2000); 

        // 2. EXTRACT HIGH-RES IMAGE
        // Targeted Selector: .jet-listing-dynamic-image__img (The full size one inside the single page)
        const imgEl = $('.jet-listing-dynamic-image__img');
        if (imgEl.length > 0) {
            highResImage = imgEl.attr('src') || imgEl.attr('data-src');
        }

        // 3. EXTRACT BRAND (Parsing Title)
        const title = $('h1.product_title').text().trim();
        if (title.toLowerCase().includes(" by ")) {
            brand = title.split(/ by /i)[1].trim();
        }

        // 4. EXTRACT ORIGINAL PRICE (Backup check on page)
        // Targeted Selector: .productpricecustom del OR .elementor-heading-title del
        let opRaw = $('.productpricecustom del .woocommerce-Price-amount').text() || 
                    $('.elementor-heading-title del .woocommerce-Price-amount').text();
        
        if (opRaw) originalPrice = parseFloat(opRaw.replace(/[^0-9.]/g, ''));

        await page.close();

    } catch (e) {
        // console.warn(`      ⚠️ Deep scrape failed for ${url}`);
    }

    return { description, category, brand, originalPrice, highResImage };
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
    // Selector based on your HTML: .jet-listing-grid__item
    const products = $('.jet-listing-grid__item');

    if (products.length === 0) return processedUrls.size;

    for (const el of products) {
        const $el = $(el);

        // 1. EXTRACT LINK & TITLE
        // Based on HTML: Title is inside h2.elementor-heading-title > a
        const titleEl = $el.find('h2.elementor-heading-title a');
        let title = titleEl.text().trim();
        let link = titleEl.attr('href');

        // 2. EXTRACT GRID IMAGE (Usually Low Res 300x300)
        // Based on HTML: .elementor-widget-image img
        let imgRaw = $el.find('.elementor-widget-image img').attr('src') || 
                     $el.find('.elementor-widget-image img').attr('data-src');

        // 3. EXTRACT PRICES (Specific HTML Structure)
        // Container: .deal-card-price-content
        // Sale: ins .woocommerce-Price-amount
        // Original: del .woocommerce-Price-amount
        const priceContainer = $el.find('.deal-card-price-content');
        
        let priceRaw = priceContainer.find('ins .woocommerce-Price-amount').text();
        let originalPriceRaw = priceContainer.find('del .woocommerce-Price-amount').text();

        // Cleaning
        const price = parseFloat(priceRaw.replace(/[^0-9.]/g, '') || '0');
        let originalPrice = parseFloat(originalPriceRaw.replace(/[^0-9.]/g, '') || '0');

        // Logic check: If original price is missing or lower than sale price, assume no discount
        if (isNaN(originalPrice) || originalPrice < price || originalPrice === 0) {
            originalPrice = price; 
        }

        if (!title || !link) continue;
        if (link.startsWith('/')) link = `https://audioplugin.deals${link}`;

        if (processedUrls.has(link)) continue;
        processedUrls.add(link);

        const slug = slugify(title, { lower: true, strict: true });
        
        // Initial Brand Parse from Title
        let brand = "Unknown";
        let cleanTitle = title;
        if (title.toLowerCase().includes(" by ")) {
            const parts = title.split(/ by /i);
            cleanTitle = parts[0].trim();
            brand = parts[1].trim();
        }

        // --- CHECK DATABASE & DECIDE DEEP SCRAPE ---
        const existingProduct = await prisma.product.findUnique({ where: { slug } });
        
        let description = existingProduct?.description || "";
        let category = existingProduct?.category || "Plugin";
        let finalImage = existingProduct?.image || null;
        
        // FORCE DEEP SCRAPE conditions:
        // 1. Description is garbage/missing
        // 2. We don't have a high-res image (existing is null or matches the low-res grid thumb)
        const isGarbageDesc = !description || description.includes("Subscribe") || description === "Imported from APD";
        const isLowQualImage = !finalImage || finalImage.includes("300x300"); // Avoid thumbnails

        if (isGarbageDesc || isLowQualImage) {
            console.log(`      🕵️ Deep Scraping Details: ${cleanTitle}`);
            const details = await deepScrapeDetails(browser, link);
            
            if (details.description && details.description.length > 20) description = details.description;
            if (details.brand && details.brand !== "Unknown") brand = details.brand;
            
            // Prefer the High Res Image from the single page
            if (details.highResImage) imgRaw = details.highResImage;

            // Wait after deep scrape
            await sleepWithJitter(scrapeDelay);
        }

        // --- IMAGE UPLOAD LOGIC ---
        if ((!finalImage || finalImage === 'null') && imgRaw) {
             if (fs.existsSync(KEY_PATH)) {
                 process.stdout.write(`      📥 Uploading Image... `); 
                 try {
                    // Upload the (hopefully high-res) image
                    finalImage = await processAndUploadImage(imgRaw, slug);
                    console.log("Done.");
                 } catch (err) {
                    console.log("Failed.");
                 }
             }
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
                    originalPrice, 
                    lastScraped: new Date() 
                },
                create: {
                    url: link, 
                    title, 
                    price, 
                    originalPrice, 
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
    console.log(`🚀 STARTING V3 MASTER CRAWL (Targeted Structure)`);
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
            scrapeDelay: 5000 
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