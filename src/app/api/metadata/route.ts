import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    // 1. Fetch Unique Brands
    const uniqueBrands = await prisma.product.findMany({
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' }
    });

    // 2. Fetch Unique Categories
    const uniqueCategories = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    // 3. Flatten & Filter
    const brands = uniqueBrands
      .map(b => b.brand)
      .filter((b): b is string => b !== null && b !== "Unknown");

    const categories = uniqueCategories
      .map(c => c.category)
      .filter((c): c is string => c !== null && c !== "Plugin");

    return NextResponse.json({ brands, categories });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}