import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis - This automatically grabs the URL and Token from your .env
const redis = Redis.fromEnv();

export async function POST(req: Request) {
  try {
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'Missing Product ID' }, { status: 400 });
    }

    // THE UPSTASH MAGIC
    // We store all views inside a Redis Hash called 'product_views'
    // 'hincrby' increments the count for this specific productId by 1.
    // This executes in ~2 milliseconds and NEVER wakes up your Neon DB.
    await redis.hincrby('product_views', productId, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to track view in Redis:", error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}