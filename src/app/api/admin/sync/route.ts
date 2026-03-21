import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { processAndUploadImage, deleteImageFromBucket } from '../../../../../scripts/utils/image-uploader';
import { mapProductData } from '../../../../../scripts/utils/universal-mapper'; 
import * as Papa from 'papaparse';

// Helper to sanitize slug
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     
    .replace(/[^\w\-]+/g, '') 
    .replace(/\-\-+/g, '-');  
}

// ⚡ NEW HELPER: Get the Base URL (strips tracking/affiliate params)
function getBaseUrl(url: string) {
  if (!url) return '';
  return url.split('?')[0].split('#')[0];
}

export async function POST(req: Request) {
  let feedId: string | null = null;

  try {
    const body = await req.json();
    feedId = body.feedId;

    // 1. Get the Feed Info
    const feed = await prisma.feed.findUnique({
      where: { id: feedId as string },
      include: { retailer: true }
    });

    if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 });

    // Set status to SYNCING
    // ⚡ PROGRESS: Reset counts to 0 when a new sync starts
    await prisma.feed.update({
      where: { id: feedId as string },
      data: { status: 'SYNCING', errorMessage: null, totalItems: 0, processedItems: 0 }
    });

    // 2. Fetch the Raw File
    console.log(`📥 Fetching data from: ${feed.url}`);
    const response = await fetch(feed.url);
    if (!response.ok) throw new Error(`Failed to download feed: ${response.statusText}`);
    
    const rawText = await response.text();
    let rawItems: any[] = [];

    if (feed.type === 'CSV') {
        const parsed = Papa.parse(rawText, { header: true, skipEmptyLines: true });
        rawItems = parsed.data;
    } else {
        const parsedJson = JSON.parse(rawText);
        rawItems = Array.isArray(parsedJson) ? parsedJson : (parsedJson.products || []);
    }

    console.log(`📦 Found ${rawItems.length} items. Building memory map...`);

    // 3. BUILD MEMORY MAP (Keyed by Base URL for intelligent matching)
    const existingListings = await prisma.listing.findMany({
      where: { retailerId: feed.retailer.id },
      select: {
        id: true,
        url: true, // The full URL currently in the DB
        price: true,
        originalPrice: true,
        product: { 
          select: { 
            id: true, 
            slug: true, 
            sourceImageUrl: true, 
            image: true,
            maxRegularPrice: true 
          } 
        }
      }
    });

    const existingMap = new Map();
    for (const listing of existingListings) {
      // ⚡ Key by Base URL so we can compare without affiliate tags
      existingMap.set(getBaseUrl(listing.url), listing);
    }

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const activeSlugs = new Set<string>();
    const deduplicatedItems = new Map();

    // 4. PRE-PROCESS & DEDUPLICATE (Identifying changes & tag updates)
    for (const rawItem of rawItems) {
      const mapped = mapProductData(rawItem, feed.affiliateTag);
      if (!mapped.title || !mapped.url) continue;

      // Identify existing product via Base URL comparison
      const existing = existingMap.get(getBaseUrl(mapped.url));
      const targetSlug = existing ? existing.product.slug : slugify(mapped.title);
      
      activeSlugs.add(targetSlug);

      // TRACK HIGHEST PRICE (Original Price Logic)
      let highestPrice = mapped.price;
      if (existing) {
          highestPrice = Math.max(
            existing.product.maxRegularPrice || 0, 
            existing.price || 0, 
            mapped.price
          );
      }
      mapped.originalPrice = highestPrice;

      // INTELLIGENT SKIP (Now includes Affiliate Tag check)
      if (existing) {
        const priceUnchanged = existing.price === mapped.price;
        const imgUnchanged = existing.product.sourceImageUrl === mapped.image;
        
        // ⚡ Check if the full URL in the DB is the same as the new tagged URL
        const urlUnchanged = existing.url === mapped.url;

        // Only skip if the price, image, AND the affiliate tag are all current
        if (priceUnchanged && imgUnchanged && urlUnchanged) {
          skipped++;
          continue; 
        }
      }

      // Use Base URL as key to ensure no duplicate products are processed in this feed
      deduplicatedItems.set(getBaseUrl(mapped.url), { mapped, targetSlug, existing });
    }

    const totalToProcess = deduplicatedItems.size;
    console.log(`🚀 Starting Sequential Sync: Processing ${totalToProcess} items...`);

    // ⚡ PROGRESS: Set the total items in the database so the frontend knows the 100% goal
    await prisma.feed.update({
        where: { id: feedId as string },
        data: { totalItems: totalToProcess }
    });

    // 5. SEQUENTIAL PROCESSING (Stability First)
    for (const itemData of deduplicatedItems.values()) {
      const { mapped, targetSlug, existing } = itemData;

      try {
        let finalBucketUrl = existing?.product?.image || null; 
        let shouldUpload = false;

        // Image Logic
        if (feed.retailer.role === 'MASTER' && mapped.image) {
            const isBucketUrl = existing?.product?.image?.includes('storage.googleapis.com');
            if (!existing || existing.product?.sourceImageUrl !== mapped.image || !isBucketUrl) {
                shouldUpload = true;
            }
        }

        if (shouldUpload) {
            try {
               const bucketUrl = await processAndUploadImage(mapped.image, targetSlug);
               if (bucketUrl) finalBucketUrl = bucketUrl;
            } catch (imgErr) {
               console.error(`Image upload failed for ${targetSlug}`);
            }
        }

        const maxDiscount = mapped.originalPrice > mapped.price 
          ? Math.round(((mapped.originalPrice - mapped.price) / mapped.originalPrice) * 100) 
          : 0;

        const productData: any = {
          title: mapped.title,
          brand: mapped.brand,
          category: mapped.category,
          minPrice: mapped.price, 
          maxRegularPrice: mapped.originalPrice,
          maxDiscount: maxDiscount
        };

        if (feed.retailer.role === 'MASTER') {
          productData.description = mapped.description;
          if (finalBucketUrl) productData.image = finalBucketUrl;
          if (mapped.image) productData.sourceImageUrl = mapped.image; 
        }

        // UPSERT PRODUCT
        const product = await prisma.product.upsert({
          where: { slug: targetSlug },
          update: productData,
          create: { 
            slug: targetSlug, 
            ...productData, 
            image: finalBucketUrl, 
            sourceImageUrl: mapped.image 
          }
        });

        // ⚡ ROBUST UPSERT LISTING (Handles URL/Tag changes by finding the ID first)
        const currentListing = await prisma.listing.findFirst({
            where: { productId: product.id, retailerId: feed.retailer.id }
        });

        const listing = await prisma.listing.upsert({
          where: { id: currentListing?.id || 'new-listing-placeholder' },
          update: {
            url: mapped.url, // This updates the URL to include the new tag if it changed
            price: mapped.price,
            originalPrice: mapped.originalPrice,
            inStock: true,
            lastScraped: new Date(),
          },
          create: {
            url: mapped.url,
            title: mapped.title,
            price: mapped.price,
            originalPrice: mapped.originalPrice,
            inStock: true,
            product: { connect: { id: product.id } },
            retailer: { connect: { id: feed.retailer.id } }
          }
        });

        // PRICE HISTORY
        if (!existing || Math.abs(existing.price - mapped.price) > 0.01) {
          await prisma.priceHistory.create({
            data: { price: mapped.price, listingId: listing.id }
          });
        }

        processed++;
        
        // ⚡ PROGRESS: Update the database every 100 items so the frontend progress bar moves
        if (processed % 100 === 0) {
            console.log(`Synced ${processed} products...`);
            await prisma.feed.update({
                where: { id: feedId as string },
                data: { processedItems: processed }
            });
        }

      } catch (itemErr) {
        console.error(`❌ Failed item ${targetSlug}:`, itemErr);
        errors++;
      }
    }

    // 6. CLEANUP
    if (feed.retailer.role === 'MASTER' && activeSlugs.size > 0) {
        const productsToDelete = await prisma.product.findMany({
            where: {
               listings: { some: { retailerId: feed.retailer.id } },
               slug: { notIn: Array.from(activeSlugs) } 
            },
            select: { id: true, slug: true, image: true }
        });

        if (productsToDelete.length > 0) {
            console.log(`🗑️ Cleaning up ${productsToDelete.length} removed products...`);
            for (const p of productsToDelete) {
                if (p.image?.includes('storage.googleapis.com')) {
                    await deleteImageFromBucket(p.slug);
                }
                try {
                    await prisma.product.delete({ where: { id: p.id } });
                } catch (delErr) {
                    console.error(`Delete failed for ${p.slug}`);
                }
            }
        } 
    }

    // Success Update
    // ⚡ PROGRESS: Ensure processedItems is fully 100% on success
    await prisma.feed.update({ 
      where: { id: feedId as string },
      data: { status: 'SUCCESS', lastSyncedAt: new Date(), processedItems: totalToProcess }
    });

    return NextResponse.json({ success: true, processed, skipped, errors });

  } catch (error: any) {
    console.error("Critical Sync Error:", error);
    if (feedId) {
        await prisma.feed.update({
            where: { id: feedId },
            data: { status: 'ERROR', errorMessage: error.message }
        });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}