import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, guestId, retailerId } = body;

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    // Record the click
    await prisma.productClick.create({
      data: {
        productId,
        guestId: guestId || 'anonymous',
        retailerId: retailerId || null
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Tracking Error:", error);
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}