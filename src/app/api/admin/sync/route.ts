import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Helper to sanitize slug
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
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
    // Assuming JSON structure is: { products: [ ... ] } or just [ ... ]
    const products = Array.isArray(data) ? data : (data.products || []);

    console.log(`📦 Found ${products.length} products. Processing...`);

    // 3. Process Each Product
    let processed = 0;
    
    for (const item of products) {
      // Map JSON fields to DB fields (Adjust these keys based on your actual JSON!)
      const title = item.title || item.name;
      const price = parseFloat(item.price || "0");
      const originalPrice = parseFloat(item.regular_price || item.original_price || item.price || "0");
      const url = item.url || item.link;
      const image = item.image || item.image_url;
      const brand = item.brand || item.developer || "Unknown";
      const category = item.category || "Plugin";
      const description = item.description || "";

      if (!title || !url) continue; // Skip bad data

      const slug = slugify(title);

      // A. UPSERT PRODUCT (Master Record)
      // Only update image/description if this is a MASTER feed
      const productData: any = {
        title,
        brand,
        category,
        // Update price cache immediately
        minPrice: price, 
        maxRegularPrice: originalPrice,
        maxDiscount: originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0
      };

      if (feed.retailer.role === 'MASTER') {
        productData.description = description;
        productData.image = image;
      }

      const product = await prisma.product.upsert({
        where: { slug: slug },
        update: productData,
        create: {
          slug,
          ...productData
        }
      });

      // B. UPSERT LISTING (The specific price from this retailer)
      const listing = await prisma.listing.upsert({
        where: { url: url },
        update: {
          price,
          originalPrice,
          inStock: true,
          lastScraped: new Date(),
        },
        create: {
          url,
          title,
          price,
          originalPrice,
          inStock: true,
          product: { connect: { id: product.id } },
          retailer: { connect: { id: feed.retailer.id } }
        }
      });

      // C. LOG HISTORY (For Charts)
      await prisma.priceHistory.create({
        data: {
          price,
          listingId: listing.id
        }
      });

      processed++;
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
    
    // Log Error to DB
    const { feedId } = await req.json().catch(() => ({ feedId: null }));
    if (feedId) {
        await prisma.feed.update({
            where: { id: feedId },
            data: { status: 'ERROR', errorMessage: error.message }
        });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}