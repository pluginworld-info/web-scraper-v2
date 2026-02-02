import { prisma } from '@/lib/db/prisma';
import Navigation from './Navigation';

export default async function Header() {
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

    // 3. Flatten data
    const brands = uniqueBrands
      .map(b => b.brand)
      .filter((b): b is string => b !== null && b !== "Unknown");

    const categories = uniqueCategories
      .map(c => c.category)
      .filter((c): c is string => c !== null && c !== "Plugin");

    // 4. Render with Real Data
    return <Navigation brands={brands} categories={categories} />;

  } catch (error) {
    // FALLBACK FOR BUILD TIME
    // When building in Docker, the Database isn't available. 
    // We catch the error and render an empty nav so the build finishes.
    console.warn("Header: Database not available (likely during build). Rendering empty nav.");
    return <Navigation brands={[]} categories={[]} />;
  }
}