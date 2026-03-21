import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStorage } from '../../../../../scripts/utils/image-uploader'; 
import { Bucket } from '@google-cloud/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Security Check: Require the ?token= parameter
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("⏰ Cron Job Started: Sweeping for Missed Orphan Images...");

    // Initialize Storage
    const { bucket } = getStorage() as { bucket: Bucket };
    const bucketName = bucket.name;

    // Fetch Bucket Objects
    const [files] = await bucket.getFiles({ prefix: 'products/' });
    const bucketFileNames = files.map(file => file.name);

    // Fetch DB Objects
    const products = await prisma.product.findMany({
      where: { image: { contains: bucketName } },
      select: { image: true },
    });

    const validDbFiles = new Set(
      products
        .map(p => {
          if (!p.image) return null;
          const regex = new RegExp(`https://storage.googleapis.com/${bucketName}/(.*)`);
          const match = p.image.match(regex);
          return match ? match[1] : null; 
        })
        .filter(Boolean)
    );

    // Find Orphans
    const orphans = bucketFileNames.filter(fileName => !validDbFiles.has(fileName));
    let deletedCount = 0;
    
    // Purge Orphans
    if (orphans.length > 0) {
        const deletePromises = orphans.map(async (fileName) => {
          try {
            await bucket.file(fileName).delete();
            deletedCount++;
          } catch (err) {
            console.error(`Failed to delete orphan: ${fileName}`, err);
          }
        });
        await Promise.all(deletePromises);
    }

    return NextResponse.json({
      success: true,
      message: "Garbage collection cron complete",
      stats: {
        totalFilesInBucket: bucketFileNames.length,
        totalValidInDb: validDbFiles.size,
        orphansFound: orphans.length,
        orphansDeleted: deletedCount
      }
    });

  } catch (error: any) {
    console.error("Garbage Collection Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}