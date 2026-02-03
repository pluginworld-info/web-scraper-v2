import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { processAndUploadImage, deleteImageFromBucket } from '../../../../../scripts/utils/image-uploader';

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
  // Define variable here so it is accessible in the catch block
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

    // Update Status to SYNCING
    await prisma.feed.update({
      where: { id: feedId as string },
      data: { status: 'SYNCING', errorMessage: null }
    });

    // 2. Fetch the JSON File
    console.log(`📥 Fetching JSON from: ${feed.url}`);
    const response = await fetch(feed.url);
    
    if (!response.ok) throw new Error(`Failed to download feed: ${response.statusText}`);
    
    const data = await response.json();
    const products = Array.isArray(data) ? data : (data.products || []);

    console.log(`📦 Found ${products.length} products. Processing...`);

    let processed = 0;
    const processedSlugs: string[] = []; 
    
    for (const item of products) {
      // ✅ MAPPING
      const title = item.title || item.name;
      const url = item.url || item.link;
      const rawPrice = item.price || item.sale_price || "0";
      const price = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ""));

      // Parse Original Price
      const rawOriginal = 
        item.originalPrice ||  
        item.original_price || 
        item.regular_price || 
        item.rrp || 
        item.msrp || 
        item.price; 

      const originalPrice = parseFloat(String(rawOriginal).replace(/[^0-9.]/g, ""));
      const finalOriginal = originalPrice < price ? price : originalPrice;

      const incomingImage = item.image || item.image_url || item.img;
      const brand = item.brand || item.developer || "Unknown";
      const category = item.category || item.type || "Plugin";
      const description = item.description || "";

      if (!title || !url) continue;

      const slug = slugify(title);
      processedSlugs.push(slug);

      // --- LOGIC: FETCH CURRENT STATE ---
      const existingProduct = await prisma.product.findUnique({
          where: { slug: slug },
          select: { id: true, sourceImageUrl: true, image: true }
      });

      // --- LOGIC: SMART IMAGE UPLOAD ---
      let finalBucketUrl = existingProduct?.image || null; 
      let shouldUpload = false;

      // Only MASTER feeds (like Plugin Boutique) manage images
      if (feed.retailer.role === 'MASTER' && incomingImage) {
          const isBucketUrl = existingProduct?.image?.includes('storage.googleapis.com');

          if (!existingProduct) {
              // Case 1: New Product -> Upload
              shouldUpload = true;
          } else if (existingProduct.sourceImageUrl !== incomingImage) {
              // Case 2: Affiliate changed the image link -> Re-upload
              console.log(`🔄 Image changed for ${slug}. Re-uploading...`);
              shouldUpload = true;
          } else if (!existingProduct.image || !isBucketUrl) {
              // Case 3 (RESCUE): Source matches, but we don't have a valid bucket URL
              console.log(`🛠️ Image missing/broken for ${slug}. Retrying upload...`);
              shouldUpload = true;
          }
      }

      if (shouldUpload) {
          try {
             // 🚨 CRITICAL CHANGE: Stop the sync if upload fails
             const bucketUrl = await processAndUploadImage(incomingImage, slug);
             
             if (bucketUrl) {
                 finalBucketUrl = bucketUrl;
             } else {
                 throw new Error("Image Upload returned null (Check Cloud Credentials)");
             }
          } catch (imgErr: any) {
             console.error(`Failed to process image for ${slug}`, imgErr);
             // 🚨 THROW ERROR UP so it is caught by the main catch block and saved to DB
             throw new Error(`Image Upload Failed for '${title}': ${imgErr.message}`);
          }
      }

      // --- A. UPSERT PRODUCT ---
      const productData: any = {
        title,
        brand,
        category,
        minPrice: price, 
        maxRegularPrice: finalOriginal,
        maxDiscount: finalOriginal > price ? Math.round(((finalOriginal - price) / finalOriginal) * 100) : 0
      };

      if (feed.retailer.role === 'MASTER') {
        productData.description = description;
        if (finalBucketUrl) productData.image = finalBucketUrl;
        if (incomingImage) productData.sourceImageUrl = incomingImage; 
      }

      const product = await prisma.product.upsert({
        where: { slug: slug },
        update: productData,
        create: {
          slug,
          ...productData,
          image: finalBucketUrl, 
          sourceImageUrl: incomingImage
        }
      });

      // --- B. UPSERT LISTING ---
      const listing = await prisma.listing.upsert({
        where: { url: url },
        update: {
          price,
          originalPrice: finalOriginal,
          inStock: true,
          lastScraped: new Date(),
        },
        create: {
          url,
          title,
          price,
          originalPrice: finalOriginal,
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

      if (!lastHistory || Math.abs(lastHistory.price - price) > 0.01) {
        await prisma.priceHistory.create({
          data: {
            price,
            listingId: listing.id
          }
        });
      }

      processed++;
    }

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
      data: { 
        status: 'SUCCESS', 
        lastSyncedAt: new Date() 
      }
    });

    return NextResponse.json({ success: true, processed });

  } catch (error: any) {
    console.error("Sync Error:", error);
    
    // 🚨 UPDATE DB STATUS TO ERROR
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