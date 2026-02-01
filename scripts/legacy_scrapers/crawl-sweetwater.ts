import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import fs from 'fs'; 
import path from 'path';
import { prisma } from '../../src/lib/db/prisma'; 
import { RetailerRole } from '@prisma/client';
import { getSimilarity } from '../utils/fuzzy-match';

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.sweetwater.com/dealzone/software-plug-in-deals';
const RETAILER_NAME = "Sweetwater";
const RETAILER_DOMAIN = "sweetwater.com";
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

const humanDelay = async (min = 1000, max = 3000) => {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(r => setTimeout(r, ms));
};

async function startScrape() {
    console.log(`🚀 STARTING ${RETAILER_NAME} CRAWL`);

    const retailer = await prisma.retailer.upsert({
        where: { name: RETAILER_NAME },
        update: {},
        create: {
            name: RETAILER_NAME,
            domain: RETAILER_DOMAIN,
            role: RetailerRole.PRICE_CHECKER,
            logo: "https://media.sweetwater.com/m/images/logos/sweetwater-logo.png"
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
        
        console.log(`   🏠 Navigating to ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await humanDelay(2000, 4000);

        // Load DB for matching
        const existingProducts = await prisma.product.findMany({ select: { id: true, title: true, slug: true } });

        // Auto-Scroll to load lazy items
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 500;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight || totalHeight > 15000) { // Limit scroll depth
                        clearInterval(timer);
                        resolve(true);
                    }
                }, 200);
            });
        });

        const content = await page.content();
        const $ = cheerio.load(content);
        
        // Sweetwater Selector: .product-card
        const productCards = $('.product-card');
        console.log(`   ✅ Found ${productCards.length} products.`);

        for (const el of productCards) {
            const $el = $(el);

            let title = $el.find('.product-card__name').text().trim();
            let link = $el.find('.product-card__name a').attr('href');
            
            // Price Parsing
            let priceText = $el.find('.product-card__price').text();
            const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

            // Original Price (Old Price)
            let originalPriceText = $el.find('.product-card__old-price').text();
            let originalPrice = parseFloat(originalPriceText.replace(/[^0-9.]/g, '')) || 0;
            if (originalPrice === 0 || originalPrice < price) originalPrice = price;

            if (!title || !link) continue;
            if (!link.startsWith('http')) link = `https://www.sweetwater.com${link}`;
            
            const rawSlug = slugify(title, { lower: true, strict: true });

            // Matching
            let matchId: string | null = null;
            const exactMatch = existingProducts.find(p => p.slug === rawSlug);
            
            if (exactMatch) {
                matchId = exactMatch.id;
            } else {
                let bestScore = 0;
                for (const p of existingProducts) {
                    const score = getSimilarity(title, p.title);
                    if (score > bestScore) {
                        bestScore = score;
                        matchId = p.id;
                    }
                }
                if (bestScore <= 0.85) matchId = null;
            }

            // Database Save
            await prisma.$transaction(async (tx) => {
                let productId = matchId;

                // Create Skeleton if new
                if (!productId) {
                    const newProduct = await tx.product.create({
                        data: {
                            title, slug: rawSlug, 
                            description: "Pending Master Crawl...",
                            brand: "Unknown", category: "Plugin", tags: ["Plugin"]
                        }
                    });
                    productId = newProduct.id;
                    existingProducts.push({ id: newProduct.id, title, slug: rawSlug });
                }

                // Update Listing
                await tx.listing.upsert({
                    where: { url: link },
                    update: { price, originalPrice, lastScraped: new Date(), productId },
                    create: { url: link, title, price, originalPrice, retailerId: retailer.id, productId: productId! }
                });

                // History
                const listing = await tx.listing.findUnique({ where: { url: link } });
                if (listing) await tx.priceHistory.create({ data: { listingId: listing.id, price } });
            });
        }

    } catch (e: any) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

startScrape();