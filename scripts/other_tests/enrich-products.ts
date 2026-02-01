import { prisma } from '../../src/lib/db/prisma';
import { processAndUploadImage } from '../utils/image-uploader'; 
import slugify from 'slugify';
import fs from 'fs'; 
import path from 'path';

// --- CONFIGURATION ---
// 🔑 PUT YOUR KEYS HERE
const GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY_HERE";
const GOOGLE_SEARCH_CX = "YOUR_SEARCH_ENGINE_ID_HERE"; 

const KEY_PATH = path.join(process.cwd(), 'service-account.json');
const DAILY_LIMIT = 95; // Safety buffer (Free tier is 100/day)

// --- HELPERS ---
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function googleSearch(query: string) {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error(`   ❌ Google API Error: ${data.error.message}`);
            return null;
        }
        return data;
    } catch (e) {
        console.error("   ❌ Network Error during search.");
        return null;
    }
}

async function startEnrichment() {
    console.log("🕵️  STARTING PRODUCT ENRICHMENT (Google API Mode)...");
    
    if (GOOGLE_API_KEY === "YOUR_GOOGLE_API_KEY_HERE") {
        console.error("❌ ERROR: You must add your GOOGLE_API_KEY and GOOGLE_SEARCH_CX in the script.");
        return;
    }

    // 1. Find Skeleton Products
    // We look for items marked "PENDING" or "PENDING_ENRICHMENT"
    const skeletons = await prisma.product.findMany({
        where: {
            OR: [
                { description: "PENDING" },
                { description: "PENDING_ENRICHMENT" },
                { description: "Found on Plugin Boutique" }, // Also fix generic descriptions
                { image: null } // Or missing images
            ]
        },
        take: DAILY_LIMIT // Respect API quota
    });

    if (skeletons.length === 0) {
        console.log("✅ No pending skeletons found! Your database is rich.");
        return;
    }

    console.log(`   🔎 Found ${skeletons.length} products to enrich.`);
    console.log(`   ⚠️  This will consume ${skeletons.length} of your daily Google Search quota.`);

    for (let i = 0; i < skeletons.length; i++) {
        const product = skeletons[i];
        const brand = product.brand === "Unknown" ? "" : product.brand;
        
        // Construct a specific query to find the official page
        const query = `${brand} ${product.title} audio plugin product page`;
        
        console.log(`\n   [${i + 1}/${skeletons.length}] Researching: "${product.title}"...`);
        
        const results = await googleSearch(query);
        await sleep(2000); // Polite delay between API calls

        if (!results || !results.items || results.items.length === 0) {
            console.log("      ⚠️  No results found on Google.");
            continue;
        }

        // 2. Extract Data from First Result (Usually Manufacturer or Major Store)
        const bestHit = results.items[0];
        const newDesc = bestHit.snippet || "";
        
        // Find High-Res Image in PageMap (OpenGraph or CSE Image)
        let newImageUrl = null;
        if (bestHit.pagemap) {
            if (bestHit.pagemap.cse_image && bestHit.pagemap.cse_image.length > 0) {
                newImageUrl = bestHit.pagemap.cse_image[0].src;
            } else if (bestHit.pagemap["og:image"] && bestHit.pagemap["og:image"].length > 0) {
                newImageUrl = bestHit.pagemap["og:image"][0];
            }
        }

        console.log(`      📝 Found Desc: "${newDesc.substring(0, 50)}..."`);
        if (newImageUrl) console.log(`      🖼️  Found Image: ${newImageUrl.substring(0, 40)}...`);

        // 3. Process & Save
        let finalImage = product.image;

        // Download/Upload Image if we found a new one AND we need one
        if (newImageUrl && (!product.image || product.image === 'null') && fs.existsSync(KEY_PATH)) {
            try {
                process.stdout.write(`      📥 Uploading Image to Bucket... `);
                // We re-slugify to ensure filename is clean
                const safeSlug = slugify(product.title, { lower: true, strict: true });
                finalImage = await processAndUploadImage(newImageUrl, safeSlug);
                console.log("✅ Done.");
            } catch (e) {
                console.log("❌ Failed to upload.");
            }
        }

        // Update DB
        await prisma.product.update({
            where: { id: product.id },
            data: {
                description: newDesc || product.description, // Keep old if new is empty
                image: finalImage,
                // Mark as enriched so we don't scan it again
                updatedAt: new Date() 
            }
        });
        
        // Optional: If you use a status field, update it here. 
        // For now, changing the description from "PENDING" is enough to remove it from the queue.
        
        console.log("      ✅ Database Updated.");
    }

    console.log("\n✅ ENRICHMENT RUN COMPLETE.");
}

startEnrichment()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());