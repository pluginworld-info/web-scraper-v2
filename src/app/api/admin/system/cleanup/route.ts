import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { deleteImageFromBucket } from '../../../../../../scripts/utils/image-uploader';

export async function POST(req: Request) {
  try {
    // 1. Find all "Zombie" Products (Products with NO active listings)
    const orphanedProducts = await prisma.product.findMany({
      where: {
        listings: {
          none: {} // This is Prisma's magic syntax to find records with 0 relations
        }
      },
      select: {
        id: true,
        slug: true,
        image: true,
      }
    });

    if (orphanedProducts.length === 0) {
      return NextResponse.json({ success: true, message: "Database is already perfectly clean.", deletedCount: 0 });
    }

    console.log(`🧹 Found ${orphanedProducts.length} orphaned products. Starting cleanup...`);

    let deletedImagesCount = 0;

    // 2. Clean up Google Cloud Storage first (so we don't leak paid storage)
    for (const orphan of orphanedProducts) {
      if (orphan.image && orphan.image.includes('storage.googleapis.com')) {
        try {
          await deleteImageFromBucket(orphan.slug);
          deletedImagesCount++;
        } catch (imgErr) {
          console.error(`Failed to delete image for ${orphan.slug}`);
        }
      }
    }

    // 3. Wipe them from the Database
    const orphanIds = orphanedProducts.map(p => p.id);
    const deleteResult = await prisma.product.deleteMany({
      where: {
        id: { in: orphanIds }
      }
    });

    return NextResponse.json({ 
        success: true, 
        message: `Successfully purged ${deleteResult.count} zombie products and freed ${deletedImagesCount} images from cloud storage.`,
        deletedCount: deleteResult.count 
    });

  } catch (error: any) {
    console.error("Database Cleanup Error:", error);
    return NextResponse.json({ error: "Failed to run database cleanup." }, { status: 500 });
  }
}