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

    // 3. Flatten & Filter Data
    const brands = uniqueBrands
      .map(b => b.brand)
      .filter((b): b is string => 
        b !== null && 
        b.trim() !== "" && 
        b.toLowerCase() !== "unknown"
      );

    const categories = uniqueCategories
      .map(c => c.category)
      .filter((c): c is string => 
        c !== null && 
        c.trim() !== "" && 
        c.toLowerCase() !== "plugin" // "Plugin" is usually a generic/default category
      );

    // 4. Render Navigation with Server Data
    return <Navigation brands={brands} categories={categories} />;

  } catch (error) {
    // FALLBACK FOR BUILD TIME / DB OFFLINE
    // This allows the build to pass even if the database isn't reachable
    console.warn("Header: Database not available. Rendering empty nav.");
    return <Navigation brands={[]} categories={[]} />;
  }
}