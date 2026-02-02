import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, targetPrice, productId } = body;

    // Validation
    if (!email || !targetPrice || !productId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Save to PostgreSQL (Prisma)
    await prisma.priceAlert.create({
      data: {
        email,
        targetPrice: Number(targetPrice),
        productId, 
        isTriggered: false
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Create Alert Error:', error);
    return NextResponse.json({ error: 'Failed to save alert' }, { status: 500 });
  }
}