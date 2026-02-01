import { prisma } from '@/lib/db/prisma';
import Navigation from './Navigation';

export default async function Header() {
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

  // 3. Flatten data to simple string arrays, filtering out nulls
  const brands = uniqueBrands
    .map(b => b.brand)
    .filter((b): b is string => b !== null && b !== "Unknown");

  const categories = uniqueCategories
    .map(c => c.category)
    .filter((c): c is string => c !== null && c !== "Plugin");

  // 4. Render the Client Component with data
  return <Navigation brands={brands} categories={categories} />;
}