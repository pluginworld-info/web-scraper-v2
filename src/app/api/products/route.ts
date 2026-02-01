import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // --- NEW: Check for specific ID (Used by Wishlist) ---
  const id = searchParams.get('id');
  
  if (id) {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          listings: {
             include: { retailer: true } // Include retailer for logos
          },
          reviews: true
        }
      });

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      // Process single product (Same logic as Grid)
      // Use cached fields first, fall back to listings
      const lowestPrice = product.minPrice > 0 
        ? product.minPrice 
        : (product.listings[0]?.price || 0);

      const totalRating = product.reviews.reduce((acc, r) => acc + r.rating, 0);
      const avgRating = product.reviews.length > 0 ? (totalRating / product.reviews.length).toFixed(1) : "0.0";

      const processedProduct = { 
        ...product, 
        lowestPrice, 
        avgRating,
        reviewCount: product.reviews.length,
        // Pass these so the card can show discounts
        maxRegularPrice: product.maxRegularPrice,
        maxDiscount: product.maxDiscount
      };

      return NextResponse.json({ product: processedProduct });
    } catch (error) {
      console.error("Single Product API Error:", error);
      return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
    }
  }

  // --- EXISTING LOGIC: Search & Pagination ---
  const skip = parseInt(searchParams.get('skip') || '0');
  const search = searchParams.get('search') || ''; 

  try {
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
        listings: {
            include: { retailer: true } // Include retailer so grid cards show logos if needed
        },
        reviews: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    const processed = products.map(p => {
      // Smart Price Logic
      const lowestPrice = p.minPrice > 0 
        ? p.minPrice 
        : (p.listings[0]?.price || 0);
        
      const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
      const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "0.0";
      
      return { 
          ...p, 
          lowestPrice, 
          avgRating,
          reviewCount: p.reviews.length,
          maxRegularPrice: p.maxRegularPrice,
          maxDiscount: p.maxDiscount
      };
    });

    return NextResponse.json(
      { products: processed },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}