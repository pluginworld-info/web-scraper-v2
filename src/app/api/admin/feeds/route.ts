import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
// ✅ Import the deleter to clean up the cloud bucket
import { deleteImageFromBucket } from '../../../../../scripts/utils/image-uploader';

// 1. GET: List all feeds grouped by Retailer
export async function GET() {
  try {
    const retailers = await prisma.retailer.findMany({
      include: {
        feeds: true // Include the new Feed relation
      },
      orderBy: { name: 'asc' }
    });
    
    // Filter out retailers that don't have feeds if you want to be strict, 
    // but usually seeing empty retailers is good for debugging.
    return NextResponse.json(retailers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch feeds" }, { status: 500 });
  }
}

// 2. POST: Add a new Site (Retailer) + Feed
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, url, type, role } = body;

    // A. Check if Retailer exists, or create one
    // We use 'upsert' to be safe, but since 'name' is unique, we can findOrCreate logic
    let retailer = await prisma.retailer.findUnique({
      where: { name: name }
    });

    if (!retailer) {
      retailer = await prisma.retailer.create({
        data: {
          name,
          domain: new URL(url).hostname, // Auto-extract domain from feed URL
          role: role || 'SPOKE'
        }
      });
    }

    // B. Create the Feed Entry
    const feed = await prisma.feed.create({
      data: {
        name: `${name} ${type} Feed`,
        url,
        type: type || 'JSON',
        status: 'IDLE',
        retailerId: retailer.id
      }
    });

    return NextResponse.json(feed);
  } catch (error) {
    console.error("Create Feed Error:", error);
    return NextResponse.json({ error: "Failed to create feed" }, { status: 500 });
  }
}

// 3. DELETE: Remove a Feed AND Wipe its Data
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    // 1. Find the feed and its retailer
    const feed = await prisma.feed.findUnique({
        where: { id },
        include: { retailer: true }
    });

    if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 });

    console.log(`🗑️ Deleting feed: ${feed.name}. Starting cleanup...`);

    // 2. Find all products associated with this Retailer
    // We look for products where the *Listing* belongs to this retailer.
    const listings = await prisma.listing.findMany({
        where: { retailerId: feed.retailerId },
        select: { productId: true }
    });

    // Extract unique Product IDs (filter out nulls)
    const productIds = Array.from(new Set(listings.map(l => l.productId).filter(pid => pid !== null))) as string[];

    if (productIds.length > 0) {
        console.log(`⚠️ Found ${productIds.length} products linked to this feed. Wiping data...`);

        // 3. Fetch Product Details (to get slugs for Image Deletion)
        const productsToDelete = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, slug: true, image: true }
        });

        // 4. Delete Images from Google Cloud Bucket
        for (const product of productsToDelete) {
            if (product.image && product.image.includes('storage.googleapis.com')) {
                await deleteImageFromBucket(product.slug);
            }
        }

        // 5. Delete Products from DB
        // NOTE: Because we added 'onDelete: Cascade' to your schema, 
        // this SINGLE command will automatically delete all related Listings, Reviews, and History.
        await prisma.product.deleteMany({
            where: { id: { in: productIds } }
        });
        
        console.log(`✅ Successfully deleted ${productIds.length} products and their assets.`);
    }

    // 6. Finally, Delete the Feed
    await prisma.feed.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, deletedCount: productIds.length });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete feed and data" }, { status: 500 });
  }
}