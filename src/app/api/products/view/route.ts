import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'Missing Product ID' }, { status: 400 });
    }

    // Atomic increment (safe for many users at once)
    // This updates the 'viewCount' field we just added to the schema
    await prisma.product.update({
      where: { id: productId },
      data: { viewCount: { increment: 1 } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to track view:", error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}