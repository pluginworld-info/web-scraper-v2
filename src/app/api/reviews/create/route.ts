import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, rating, comment, authorName } = body;

    // Validation
    if (!productId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save to Database
    const review = await prisma.review.create({
      data: {
        rating: Number(rating),
        comment: comment || '',
        authorName: authorName || 'Guest', // Save guest name
        product: { connect: { id: productId } }
      }
    });

    return NextResponse.json({ success: true, review });

  } catch (error: any) {
    console.error('Review Error:', error);
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}