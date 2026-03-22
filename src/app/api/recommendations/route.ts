import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const { wishlist = [], history = [], search = "" } = await req.json();

    let recommendedProducts: any[] = [];
    
    // Combine IDs we want to base our recommendations on
    const targetIds = [...wishlist, ...history].filter(Boolean);

    // 1. Target by History/Wishlist Categories
    if (targetIds.length > 0) {
      // Find out what categories the user likes
      const referenceProducts = await prisma.product.findMany({
        where: { id: { in: targetIds } },
        select: { category: true }
      });
      
      const categories = [...new Set(referenceProducts.map(p => p.category).filter(Boolean))] as string[];

      if (categories.length > 0) {
        recommendedProducts = await prisma.product.findMany({
          where: {
            category: { in: categories },
            id: { notIn: targetIds } // Don't show them things they've already looked at! Show new stuff.
          },
          take: 4, // Get exactly 4
          include: { 
            listings: { orderBy: { price: 'asc' } },
          }
        });
      }
    }

    // 2. Fallback: Target by Search Term (if we didn't find 4 category matches)
    if (recommendedProducts.length < 4 && search) {
       const searchProducts = await prisma.product.findMany({
           where: {
               OR: [
                   { title: { contains: search, mode: 'insensitive' } },
                   { brand: { contains: search, mode: 'insensitive' } },
                   { category: { contains: search, mode: 'insensitive' } }
               ],
               id: { notIn: recommendedProducts.map(p => p.id) }
           },
           take: 4 - recommendedProducts.length,
           include: { listings: { orderBy: { price: 'asc' } } }
       });
       recommendedProducts = [...recommendedProducts, ...searchProducts];
    }

    // 3. Last Resort Fallback: Just grab 4 top-discounted items
    if (recommendedProducts.length < 4) {
      const randomProducts = await prisma.product.findMany({
        where: { id: { notIn: recommendedProducts.map(p => p.id) } },
        take: 4 - recommendedProducts.length,
        orderBy: { maxDiscount: 'desc' },
        include: { listings: { orderBy: { price: 'asc' } } }
      });
      recommendedProducts = [...recommendedProducts, ...randomProducts];
    }

    // Format the prices perfectly for the frontend component
    const processed = recommendedProducts.map(p => {
        const bestListing = p.listings[0];
        const lowestPrice = bestListing ? bestListing.price : 0;
        return { 
          id: p.id,
          title: p.title,
          slug: p.slug,
          image: p.image,
          lowestPrice 
        };
    });

    return NextResponse.json({ products: processed });

  } catch (error) {
    console.error("Recommendation Error:", error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}