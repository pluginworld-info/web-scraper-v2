import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { deleteImageFromBucket } from '../../../../../scripts/utils/image-uploader';

export async function GET() {
  try {
    const retailers = await prisma.retailer.findMany({
      include: { feeds: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(retailers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch feeds" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, url, type, role } = body;

    let retailer = await prisma.retailer.findUnique({
      where: { name: name }
    });

    if (!retailer) {
      retailer = await prisma.retailer.create({
        data: {
          name,
          domain: new URL(url).hostname, 
          role: role || 'SPOKE'
        }
      });
    }

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

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    const feed = await prisma.feed.findUnique({
        where: { id },
        include: { retailer: true }
    });

    if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 });

    console.log(`🗑️ Analyzing cleanup for feed: ${feed.name}`);

    // --- PHASE 1: IDENTIFY ORPHANS ---
    // Find all listings for this retailer
    const retailerListings = await prisma.listing.findMany({
        where: { retailerId: feed.retailerId },
        select: { productId: true }
    });
    
    const involvedProductIds = Array.from(new Set(retailerListings.map(l => l.productId).filter(p => p !== null))) as string[];

    const orphansToWipe: string[] = [];
    const imagesToDelete: { slug: string, image: string | null }[] = [];

    // Check each involved product: Will it be empty after we delete this retailer's listings?
    for (const pid of involvedProductIds) {
        // Count how many listings this product has IN TOTAL (across all retailers)
        const count = await prisma.listing.count({
            where: { productId: pid }
        });
        
        // If it only has 1 listing (which belongs to the retailer we are deleting), it will become an orphan.
        if (count <= 1) {
            orphansToWipe.push(pid);
            
            // Fetch image info NOW before we delete the DB record
            const pInfo = await prisma.product.findUnique({
                where: { id: pid },
                select: { slug: true, image: true }
            });
            if (pInfo) imagesToDelete.push(pInfo);
        }
    }

    console.log(`Analysis: ${retailerListings.length} listings to remove. ${orphansToWipe.length} products will become orphans.`);

    // --- PHASE 2: ATOMIC DATABASE CLEANUP ---
    await prisma.$transaction(async (tx) => {
        // 1. Delete Listings (This breaks the link, but keeps the product if it has other links)
        await tx.listing.deleteMany({
            where: { retailerId: feed.retailerId }
        });

        // 2. Delete Orphans (Products that no longer have any listings)
        if (orphansToWipe.length > 0) {
            await tx.product.deleteMany({
                where: { id: { in: orphansToWipe } }
            });
        }

        // 3. Delete the Feed
        await tx.feed.delete({
            where: { id }
        });
    });

    // --- PHASE 3: CLOUD STORAGE CLEANUP ---
    // Only runs if DB transaction succeeded
    if (imagesToDelete.length > 0) {
        console.log(`☁️ Removing images for ${imagesToDelete.length} deleted products...`);
        for (const img of imagesToDelete) {
            if (img.image && img.image.includes('storage.googleapis.com')) {
                // Run in background, don't block response
                deleteImageFromBucket(img.slug).catch(err => console.error(err));
            }
        }
    }

    return NextResponse.json({ 
        success: true, 
        deletedListings: retailerListings.length, 
        deletedProducts: orphansToWipe.length 
    });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete feed and data" }, { status: 500 });
  }
} 