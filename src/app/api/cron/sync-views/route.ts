import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(req: Request) {
  try {
    // 1. Grab all the pending views from Redis
    // This returns an object like: { "productId-1": 45, "productId-2": 12 }
    const pendingViews: Record<string, string | number> | null = await redis.hgetall('product_views');

    // If there are no views, just exit and let Neon keep sleeping!
    if (!pendingViews || Object.keys(pendingViews).length === 0) {
      return NextResponse.json({ message: 'No new views to sync. Neon remains asleep.' });
    }

    // 2. Prepare the batch updates for Prisma
    const updatePromises = Object.entries(pendingViews).map(([productId, viewCount]) => {
      return prisma.product.update({
        where: { id: productId },
        data: { viewCount: { increment: Number(viewCount) } },
      });
    });

    // 3. WAKE UP NEON: Execute all updates simultaneously in one transaction
    await prisma.$transaction(updatePromises);

    // 4. Clear the Redis cache so we don't count these views again tomorrow
    await redis.del('product_views');

    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${Object.keys(pendingViews).length} products.` 
    });

  } catch (error) {
    console.error("Failed to sync views to Neon:", error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}