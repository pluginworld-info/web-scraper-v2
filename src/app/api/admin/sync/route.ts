import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
// ✅ Import uploader & deleter from root scripts folder
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
  try {
    const { feedId } = await req.json();

    // 1. Get the Feed Info
    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      include: { retailer: true }
    });

    if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 });

    // Update Status to SYNCING
    await prisma.feed.update({
      where: { id: feedId },
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
    const processedSlugs: string[] = []; // Track slugs to find deleted items later
    
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
      // We check what we currently have in the DB to compare images
      const existingProduct = await prisma.product.findUnique({
          where: { slug: slug },
          select: { id: true, sourceImageUrl: true, image: true }
      });

      // --- LOGIC: SMART IMAGE UPLOAD ---
      let finalBucketUrl = existingProduct?.image || null; // Default to existing bucket URL
      let shouldUpload = false;

      // Only MASTER feeds (like Plugin Boutique) manage images
      if (feed.retailer.role === 'MASTER' && incomingImage) {
          if (!existingProduct) {
              // Case 1: New Product -> Upload
              shouldUpload = true;
          } else if (existingProduct.sourceImageUrl !== incomingImage) {
              // Case 2: Affiliate changed the image link -> Re-upload
              console.log(`🔄 Image changed for ${slug}. Re-uploading...`);
              shouldUpload = true;
          }
          // Case 3: URLs match -> Do nothing (Keep existing Bucket URL)
      }

      if (shouldUpload) {
          try {
             const bucketUrl = await processAndUploadImage(incomingImage, slug);
             if (bucketUrl) {
                 finalBucketUrl = bucketUrl;
             }
          } catch (imgErr) {
             console.error(`Failed to process image for ${slug}`, imgErr);
             // We continue even if image fails, to ensure price updates still happen
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
        // ✅ SAVE BOTH URLs
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
    // Only run this for MASTER feeds to prevent data loss from partial updates
    if (feed.retailer.role === 'MASTER' && processedSlugs.length > 0) {
        
        // Find products owned by this retailer that were NOT in the feed
        const productsToDelete = await prisma.product.findMany({
            where: {
               listings: { some: { retailerId: feed.retailer.id } },
               slug: { notIn: processedSlugs } // The ones missing from the feed
            },
            select: { id: true, slug: true, image: true }
        });

        if (productsToDelete.length > 0) {
            console.log(`🗑️ Detected ${productsToDelete.length} removed products. Cleaning up...`);
            
            for (const p of productsToDelete) {
                // 1. Delete Image from Cloud Bucket
                if (p.image && p.image.includes('storage.googleapis.com')) {
                    await deleteImageFromBucket(p.slug);
                }

                // 2. Delete Product from DB 
                // Note: Ensure your Prisma schema has onDelete: Cascade for relations to avoid errors
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
      where: { id: feedId },
      data: { 
        status: 'SUCCESS', 
        lastSyncedAt: new Date() 
      }
    });

    return NextResponse.json({ success: true, processed });

  } catch (error: any) {
    console.error("Sync Error:", error);
    
    try {
        const { feedId } = await req.json();
        if (feedId) {
            await prisma.feed.update({
                where: { id: feedId },
                data: { status: 'ERROR', errorMessage: error.message }
            });
        }
    } catch (e) { /* ignore */ }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}