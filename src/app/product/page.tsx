// FILE: src/app/product/page.tsx

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Forces fresh data on every visit

import { prisma } from '@/lib/db/prisma';
import ProductGrid from '@/components/ProductGrid';

export default async function AllProductsPage() {
  // 1. Get the total number of products for pagination logic
  const totalCount = await prisma.product.count();

  // 2. Fetch products (Initial batch of 12)
  const products = await prisma.product.findMany({
    take: 12,
    include: {
      listings: true,
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  // 3. Process Data
  const processedProducts = products.map(p => {
    const prices = p.listings.map(l => l.price).filter(p => p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    
    const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "N/A";

    return { ...p, lowestPrice, avgRating };
  });

  return (
    <main className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">All Plugins</h1>
        
        {/* Now passing totalCount to fix the TypeScript error */}
        <ProductGrid 
          initialProducts={processedProducts} 
          totalCount={totalCount} 
        />
      </div>
    </main>
  );
}