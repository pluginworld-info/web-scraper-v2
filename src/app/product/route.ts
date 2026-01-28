import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skip = parseInt(searchParams.get('skip') || '0');

  try {
    const products = await prisma.product.findMany({
      skip: skip,
      take: 12,
      include: {
        listings: true,
        reviews: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Process exactly like the main page
    const processed = products.map(p => {
      const prices = p.listings.map(l => l.price).filter(pr => pr > 0);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
      const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "N/A";
      return { ...p, lowestPrice, avgRating };
    });

    return NextResponse.json({ products: processed });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}