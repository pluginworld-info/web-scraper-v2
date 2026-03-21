import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStorage } from '../../../../../../scripts/utils/image-uploader'; 
import { Bucket } from '@google-cloud/storage';

export const dynamic = 'force-dynamic';

// ⚡ SHARED LOGIC FUNCTION
async function runGarbageCollection() {
    const { bucket } = getStorage() as { bucket: Bucket };
    const bucketName = bucket.name;

    const [files] = await bucket.getFiles({ prefix: 'products/' });
    const bucketFileNames = files.map(file => file.name);

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

    const orphans = bucketFileNames.filter(fileName => !validDbFiles.has(fileName));
    let deletedCount = 0;
    
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

    return {
        totalFilesInBucket: bucketFileNames.length,
        totalValidInDb: validDbFiles.size,
        orphansFound: orphans.length,
        orphansDeleted: deletedCount
    };
}

// 🤖 FOR THE CRON JOB (Requires Token)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await runGarbageCollection();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🖱️ FOR THE UI BUTTON (Manual Trigger)
export async function POST() {
  try {
    const stats = await runGarbageCollection();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}