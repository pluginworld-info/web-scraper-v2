import fs from 'fs'; 
import path from 'path';
import slugify from 'slugify';
import { prisma } from '../src/lib/db/prisma'; 
import { RetailerRole } from '@prisma/client';
import { findBestMatch } from '../src/lib/product-matcher';
import { processAndUploadImage } from './utils/image-uploader';

const KEY_PATH = path.join(process.cwd(), 'service-account.json');

// --- INTERFACES ---
interface FeedItem {
    title: string;
    price: number;
    originalPrice: number;
    url: string;
    image: string;
    brand: string;
    category: string;
    description?: string;
}

interface FeedData {
    siteName: string;
    siteUrl: string;
    siteLogo: string;
    role: "MASTER" | "SPOKE"; // We declare this in the JSON now
    products: FeedItem[];
}

// --- SMART PRICE CALCULATOR ---
async function recalculateProductStats(productId: string) {
    // 1. Fetch all listings for this product
    const listings = await prisma.listing.findMany({
        where: { productId },
        select: { price: true, originalPrice: true }
    });

    if (listings.length === 0) return;

    // 2. Calculate Stats
    // Min Price: The absolute lowest 'price' field found.
    const minPrice = Math.min(...listings.map(l => l.price));
    
    // Max Regular: The highest 'originalPrice' found (to show biggest strikethrough).
    // If originalPrice is missing/null, fall back to price.
    const maxRegularPrice = Math.max(...listings.map(l => l.originalPrice || l.price));
    
    // Max Discount %
    let maxDiscount = 0;
    if (maxRegularPrice > minPrice) {
        maxDiscount = Math.round(((maxRegularPrice - minPrice) / maxRegularPrice) * 100);
    }

    // 3. Update Product Cache
    await prisma.product.update({
        where: { id: productId },
        data: { minPrice, maxRegularPrice, maxDiscount }
    });
}

// --- MAIN ENGINE ---
async function ingestFeed(filePath: string) {
    console.log(`🚀 STARTING INGESTION ENGINE`);
    console.log(`   📂 Reading file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error("❌ File not found!");
        return;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const feed: FeedData = JSON.parse(rawData);
    const IS_MASTER = feed.role === "MASTER";

    console.log(`   🏪 Retailer: ${feed.siteName} [${feed.role}]`);
    console.log(`   📦 Products: ${feed.products.length}`);

    // 1. Upsert Retailer
    const retailer = await prisma.retailer.upsert({
        where: { name: feed.siteName },
        update: { logo: feed.siteLogo, role: feed.role as RetailerRole },
        create: {
            name: feed.siteName,
            domain: feed.siteUrl,
            role: feed.role as RetailerRole,
            logo: feed.siteLogo
        }
    });

    // 2. Load DB for Matching
    const dbProducts = await prisma.product.findMany({ 
        select: { id: true, title: true, slug: true, tags: true, brand: true, image: true } 
    });

    // 3. Process Items
    for (let i = 0; i < feed.products.length; i++) {
        const item = feed.products[i];
        
        // Data Normalization
        const price = item.price;
        const originalPrice = item.originalPrice || item.price;
        const brand = item.brand || "Unknown";
        const category = item.category || "Plugin";
        
        // --- MATCHING ---
        const match = findBestMatch(item.title, brand, dbProducts);
        
        let productId = match?.product.id;
        let existingTags = match?.product.tags || [];
        let hasImageInDB = match?.product.image ? true : false;
        let finalImage = match?.product.image;

        console.log(`   --------------------------------------------------`);
        console.log(`   [${i + 1}/${feed.products.length}] 📦 ${item.title}`);
        
        // Image Logic
        // IF Product is New OR (We are MASTER and want to overwrite) OR (Image is missing)
        // THEN upload the new image.
        const shouldProcessImage = (!productId) || (IS_MASTER) || (!hasImageInDB);
        
        if (shouldProcessImage && item.image) {
            // Check if we already have this exact image url processed to save time? 
            // For now, we assume if we are Master, we enforce our image.
            if (fs.existsSync(KEY_PATH)) {
                try {
                    const tempSlug = slugify(item.title, { lower: true, strict: true });
                    // Only log if we are actually doing it
                    if (!hasImageInDB || IS_MASTER) {
                         process.stdout.write(`      📥 Processing Image... `);
                         finalImage = await processAndUploadImage(item.image, tempSlug);
                         console.log("✅ Done.");
                    }
                } catch (e) { console.log("Skipped (Upload Error)."); }
            } else {
                // If no service account, use raw URL
                finalImage = item.image;
            }
        }

        // --- DATABASE TRANSACTION ---
        await prisma.$transaction(async (tx) => {
            // A. Product Operations
            if (!productId) {
                // CREATE NEW PRODUCT
                const newSlug = slugify(item.title, { lower: true, strict: true });
                const newProduct = await tx.product.create({
                    data: {
                        title: item.title, 
                        slug: newSlug, 
                        image: finalImage,
                        description: item.description || `Imported from ${feed.siteName}`,
                        brand, category, tags: [category],
                        // Initialize stats
                        minPrice: price, maxRegularPrice: originalPrice, maxDiscount: 0
                    }
                });
                productId = newProduct.id;
                dbProducts.push({ id: newProduct.id, title: item.title, slug: newSlug, tags: [category], brand, image: finalImage });
                console.log(`      ✨ Created New Product`);
            } else {
                // UPDATE EXISTING PRODUCT
                // Rule: Only MASTER can update Title/Desc/Image/Brand on existing items.
                // Spoke can ONLY update tags or backfill missing images.
                
                const updateData: any = {};
                
                if (IS_MASTER) {
                    updateData.title = item.title;
                    updateData.description = item.description;
                    updateData.brand = brand;
                    updateData.category = category;
                    if (finalImage) updateData.image = finalImage;
                    console.log(`      👑 MASTER Update Applied (Metadata)`);
                }

                // Spoke & Master can both enrich tags
                if (category !== "Plugin" && !existingTags.includes(category)) {
                    updateData.tags = { push: category };
                }
                
                // Backfill image if missing (anyone can do this)
                if (!hasImageInDB && finalImage) {
                    updateData.image = finalImage;
                }

                if (Object.keys(updateData).length > 0) {
                    await tx.product.update({ where: { id: productId }, data: updateData });
                } else {
                    console.log(`      🛡️  Spoke Feed: Metadata locked by Master.`);
                }
            }

            // B. Listing Operations
            const existingListing = await tx.listing.findFirst({
                where: { retailerId: retailer.id, productId: productId }
            });

            let listingId = existingListing?.id;
            let priceChanged = true;

            if (existingListing) {
                await tx.listing.update({
                    where: { id: existingListing.id },
                    data: { price, originalPrice, url: item.url, lastScraped: new Date() }
                });
                listingId = existingListing.id;
                priceChanged = existingListing.price !== price;
            } else {
                const newListing = await tx.listing.create({
                    data: { url: item.url, title: item.title, price, originalPrice, retailerId: retailer.id, productId: productId! }
                });
                listingId = newListing.id;
                console.log(`      ➕ New Listing Created`);
            }

            // C. History
            if (priceChanged && listingId) {
                await tx.priceHistory.create({ data: { listingId: listingId, price } });
            }
        });

        // D. RECALCULATE STATS (The "Smart Price" Engine)
        if (productId) await recalculateProductStats(productId);
    }

    console.log(`\n✅ INGESTION COMPLETE!`);
}

// Run: npx tsx scripts/ingest-feed.ts data/plugin_boutique_feed.json
const fileArg = process.argv[2];
if (!fileArg) console.error("Please provide a file path argument.");
else ingestFeed(fileArg)
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());