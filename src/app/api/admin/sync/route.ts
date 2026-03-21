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

    await prisma.feed.update({
      where: { id: feedId as string },
      data: { status: 'SYNCING', errorMessage: null }
    });

    // 2. Fetch the Raw File
    console.log(`📥 Fetching data from: ${feed.url}`);
    const response = await fetch(feed.url);
    if (!response.ok) throw new Error(`Failed to download feed: ${response.statusText}`);
    
    const rawText = await response.text();
    let rawItems = [];

    // ⚡ FIX: DYNAMIC PARSING FOR JSON OR CSV
    if (feed.type === 'CSV') {
        const parsed = Papa.parse(rawText, { header: true, skipEmptyLines: true });
        rawItems = parsed.data;
    } else {
        const parsedJson = JSON.parse(rawText);
        rawItems = Array.isArray(parsedJson) ? parsedJson : (parsedJson.products || []);
    }

    console.log(`📦 Found ${rawItems.length} raw items. Processing...`);

    let processed = 0;
    let skipped = 0; // ⚡ NEW: Track how much compute we saved
    const processedSlugs: string[] = []; 
    
    for (const rawItem of rawItems) {
      // ⚡ FIX: PASS THROUGH UNIVERSAL MAPPER
      const mapped = mapProductData(rawItem, feed.affiliateTag);
      
      if (!mapped.title || !mapped.url) continue;

      const slug = slugify(mapped.title);
      processedSlugs.push(slug);

      // --- LOGIC: FETCH CURRENT STATE ---
      const existingProduct = await prisma.product.findUnique({
          where: { slug: slug },
          include: { 
            listings: { where: { retailerId: feed.retailer.id } } 
          }
      });

      const existingListing = existingProduct?.listings[0];

      // ⚡ FIX: THE "SMART SKIP" OPTIMIZATION
      // If the product exists, and the price, original price, and image haven't changed, DO NOTHING.
      if (existingProduct && existingListing) {
          const priceUnchanged = existingListing.price === mapped.price;
          const originalPriceUnchanged = existingListing.originalPrice === mapped.originalPrice;
          const imageUnchanged = existingProduct.sourceImageUrl === mapped.image;

          if (priceUnchanged && originalPriceUnchanged && imageUnchanged) {
              skipped++;
              continue; // 🚀 SKIPS DATABASE WRITE AND IMAGE LOGIC ENTIRELY
          }
      }

      // --- LOGIC: SMART IMAGE UPLOAD ---
      let finalBucketUrl = existingProduct?.image || null; 
      let shouldUpload = false;

      if (feed.retailer.role === 'MASTER' && mapped.image) {
          const isBucketUrl = existingProduct?.image?.includes('storage.googleapis.com');

          if (!existingProduct) {
              shouldUpload = true;
          } else if (existingProduct.sourceImageUrl !== mapped.image) {
              console.log(`🔄 Image changed for ${slug}. Re-uploading...`);
              shouldUpload = true;
          } else if (!existingProduct.image || !isBucketUrl) {
              console.log(`🛠️ Image missing/broken for ${slug}. Retrying upload...`);
              shouldUpload = true;
          }
      }

      if (shouldUpload) {
          try {
             const bucketUrl = await processAndUploadImage(mapped.image, slug);
             if (bucketUrl) {
                 finalBucketUrl = bucketUrl;
             } else {
                 throw new Error("Image Upload returned null (Check Cloud Credentials)");
             }
          } catch (imgErr: any) {
             console.error(`Failed to process image for ${slug}`, imgErr);
             throw new Error(`Image Upload Failed for '${mapped.title}': ${imgErr.message}`);
          }
      }

      // --- A. UPSERT PRODUCT ---
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

      const product = await prisma.product.upsert({
        where: { slug: slug },
        update: productData,
        create: {
          slug,
          ...productData,
          image: finalBucketUrl, 
          sourceImageUrl: mapped.image
        }
      });

      // --- B. UPSERT LISTING ---
      const listing = await prisma.listing.upsert({
        where: { url: mapped.url },
        update: {
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

      // --- C. LOG HISTORY ---
      const lastHistory = await prisma.priceHistory.findFirst({
        where: { listingId: listing.id },
        orderBy: { date: 'desc' }
      });

      if (!lastHistory || Math.abs(lastHistory.price - mapped.price) > 0.01) {
        await prisma.priceHistory.create({
          data: {
            price: mapped.price,
            listingId: listing.id
          }
        });
      }

      processed++;
    }

    console.log(`✅ Sync Complete: Processed ${processed}, Skipped ${skipped} (Resource Saver Active)`);

    // --- 3. CLEANUP: REMOVE DELETED PRODUCTS ---
    if (feed.retailer.role === 'MASTER' && processedSlugs.length > 0) {
        const productsToDelete = await prisma.product.findMany({
            where: {
               listings: { some: { retailerId: feed.retailer.id } },
               slug: { notIn: processedSlugs } 
            },
            select: { id: true, slug: true, image: true }
        });

        if (productsToDelete.length > 0) {
            console.log(`🗑️ Detected ${productsToDelete.length} removed products. Cleaning up...`);
            
            for (const p of productsToDelete) {
                if (p.image && p.image.includes('storage.googleapis.com')) {
                    await deleteImageFromBucket(p.slug);
                }
                try {
                    await prisma.product.delete({ where: { id: p.id } });
                } catch (delErr) {
                    console.error(`Failed to delete product ${p.slug} from DB`, delErr);
                }
            }
        } 
    }

    // 4. Success!
    await prisma.feed.update({ 
      where: { id: feedId as string },
      data: { status: 'SUCCESS', lastSyncedAt: new Date() }
    });

    return NextResponse.json({ success: true, processed, skipped });

  } catch (error: any) {
    console.error("Sync Error:", error);
    
    if (feedId) {
        try {
            await prisma.feed.update({
                where: { id: feedId },
                data: { status: 'ERROR', errorMessage: error.message }
            });
        } catch (dbErr) {
            console.error("Failed to save error state to DB", dbErr);
        }
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}