import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

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
    // Support both direct array and object with 'products' key
    const products = Array.isArray(data) ? data : (data.products || []);

    console.log(`📦 Found ${products.length} products. Processing...`);

    let processed = 0;
    
    for (const item of products) {
      // ✅ MAPPING: Based on your plugin_boutique.json
      const title = item.title || item.name;
      const url = item.url || item.link;
      
      // PARSE CURRENT PRICE
      const rawPrice = item.price || item.sale_price || "0";
      const price = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ""));

      // PARSE ORIGINAL PRICE (The Fix)
      const rawOriginal = 
        item.originalPrice ||  // <--- EXACT KEY from your JSON
        item.original_price || 
        item.regular_price || 
        item.rrp || 
        item.msrp || 
        item.price; // Fallback to current price if missing

      const originalPrice = parseFloat(String(rawOriginal).replace(/[^0-9.]/g, ""));

      // Logic: Final Original Price cannot be lower than Sale Price
      const finalOriginal = originalPrice < price ? price : originalPrice;

      const image = item.image || item.image_url || item.img;
      const brand = item.brand || item.developer || "Unknown";
      const category = item.category || item.type || "Plugin";
      const description = item.description || "";

      if (!title || !url) continue;

      const slug = slugify(title);

      // A. UPSERT PRODUCT (Master Record)
      const productData: any = {
        title,
        brand,
        category,
        minPrice: price, 
        maxRegularPrice: finalOriginal,
        maxDiscount: finalOriginal > price ? Math.round(((finalOriginal - price) / finalOriginal) * 100) : 0
      };

      // Only MASTER feeds update content fields
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

      // B. UPSERT LISTING
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

      // C. LOG HISTORY
      // Only create history entry if price changed or it's the first entry
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
    
    // Attempt to log error to DB
    try {
        const { feedId } = await req.json();
        if (feedId) {
            await prisma.feed.update({
                where: { id: feedId },
                data: { status: 'ERROR', errorMessage: error.message }
            });
        }
    } catch (e) { /* ignore json parse error on fail */ }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}