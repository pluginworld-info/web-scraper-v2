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

    // ⚡ UPGRADE: Check for an existing untriggered alert for this user and product
    const existingAlert = await prisma.priceAlert.findFirst({
        where: {
            email: email,
            productId: productId,
            isTriggered: false
        }
    });

    if (existingAlert) {
        // Update the existing alert with the new target price
        await prisma.priceAlert.update({
            where: { id: existingAlert.id },
            data: { targetPrice: Number(targetPrice) }
        });
    } else {
        // Save new alert to PostgreSQL (Prisma)
        await prisma.priceAlert.create({
          data: {
            email,
            targetPrice: Number(targetPrice),
            productId, 
            isTriggered: false
          }
        });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Create Alert Error:', error);
    return NextResponse.json({ error: 'Failed to save alert' }, { status: 500 });
  }
}