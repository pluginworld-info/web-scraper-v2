import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 1. Get query parameters
  const skip = parseInt(searchParams.get('skip') || '0');
  const search = searchParams.get('search') || ''; // Added search param

  try {
    // 2. Fetch products with optional search filter
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      },
      skip: skip,
      take: 12,
      include: {
        listings: true,
        reviews: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // 3. Process Data
    const processed = products.map(p => {
      const prices = p.listings.map(l => l.price).filter(pr => pr > 0);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
      const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "N/A";
      return { ...p, lowestPrice, avgRating };
    });

    // 4. Return JSON with the Cache-Control header included
    return NextResponse.json(
      { products: processed },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0', // Prevents stale data
        },
      }
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}