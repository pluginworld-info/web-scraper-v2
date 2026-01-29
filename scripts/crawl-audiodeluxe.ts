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

const BASE_URL = 'https://www.audiodeluxe.com/hot-deals';
const RETAILER_NAME = "AudioDeluxe";
const RETAILER_DOMAIN = "audiodeluxe.com";

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
        }
    });

    const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await humanDelay(2000, 3000);

        const existingProducts = await prisma.product.findMany({ select: { id: true, title: true, slug: true } });

        // Simple Pagination Loop (1-5 pages usually covers "Hot Deals")
        for (let i = 0; i < 5; i++) {
             console.log(`   📄 Page ${i+1}`);
             
             const content = await page.content();
             const $ = cheerio.load(content);
             const products = $('.views-row'); // Standard Drupal View Row

             if (products.length === 0) break;

             for (const el of products) {
                 const $el = $(el);
                 let title = $el.find('.views-field-title a').text().trim();
                 let link = $el.find('.views-field-title a').attr('href');
                 
                 let priceText = $el.find('.product-price').text();
                 // Often hidden in "Add to Cart" for AD, requires fallback
                 if (!priceText) priceText = $el.find('.uc-price').text(); 
                 
                 const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

                 // Original Price
                 let originalPriceText = $el.find('.product-old-price').text();
                 let originalPrice = parseFloat(originalPriceText.replace(/[^0-9.]/g, '')) || 0;
                 if (originalPrice === 0 || originalPrice < price) originalPrice = price;

                 if (!title || !link) continue;
                 if (!link.startsWith('http')) link = `https://www.audiodeluxe.com${link}`;
                 
                 const rawSlug = slugify(title, { lower: true, strict: true });

                 // MATCHING
                 let matchId: string | null = null;
                 const exactMatch = existingProducts.find(p => p.slug === rawSlug);
                 if (exactMatch) matchId = exactMatch.id;
                 else {
                     let bestScore = 0;
                     for (const p of existingProducts) {
                         const score = getSimilarity(title, p.title);
                         if (score > bestScore) { bestScore = score; matchId = p.id; }
                     }
                     if (bestScore <= 0.85) matchId = null;
                 }

                 // SAVE
                 await prisma.$transaction(async (tx) => {
                     let productId = matchId;
                     if (!productId) {
                         const newProduct = await tx.product.create({
                             data: { title, slug: rawSlug, description: "Pending...", brand: "Unknown", category: "Plugin" }
                         });
                         productId = newProduct.id;
                         existingProducts.push({ id: newProduct.id, title, slug: rawSlug });
                     }
                     await tx.listing.upsert({
                         where: { url: link },
                         update: { price, originalPrice, lastScraped: new Date(), productId },
                         create: { url: link, title, price, originalPrice, retailerId: retailer.id, productId: productId! }
                     });
                     
                     const listing = await tx.listing.findUnique({ where: { url: link } });
                     if (listing) await tx.priceHistory.create({ data: { listingId: listing.id, price } });
                 });
             }

             // Next Page
             const nextLink = $('.pager__item--next a').attr('href');
             if (nextLink) {
                 await page.goto(`https://www.audiodeluxe.com${nextLink}`, { waitUntil: 'domcontentloaded' });
                 await humanDelay(1500, 2500);
             } else {
                 break;
             }
        }

    } catch (e: any) {
        console.error(e);
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

startScrape();