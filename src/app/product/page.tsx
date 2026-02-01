// FILE: src/app/product/page.tsx

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Forces fresh data on every visit

import { prisma } from '@/lib/db/prisma';
import ProductGrid from '@/components/ProductGrid';

export default async function AllProductsPage() {
  // 1. Get the total number of products for pagination logic
  const totalCount = await prisma.product.count();

  // 2. Fetch products (Initial batch of 12)
  // We include 'listings' just in case we need a fallback, but we primarily rely on the cached fields now.
  const products = await prisma.product.findMany({
    take: 12,
    include: {
      listings: {
        orderBy: { price: 'asc' }, // Get cheapest first, just in case
        take: 1
      },
      reviews: true
    },
    // You can now easily change this to: orderBy: { maxDiscount: 'desc' } for a "Deals" page!
    orderBy: { updatedAt: 'desc' }
  });

  // 3. Process Data (Optimized)
  const processedProducts = products.map(p => {
    // SMART PRICE LOGIC:
    // Use the cached 'minPrice' if available. 
    // Fallback to the first listing's price if the cache is 0 (e.g. for old data not yet re-ingested).
    const lowestPrice = p.minPrice > 0 
      ? p.minPrice 
      : (p.listings[0]?.price || 0);

    const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "N/A";

    return { 
      ...p, 
      lowestPrice, 
      avgRating,
      // We pass these new fields so the Grid Card can show "80% OFF" badges
      maxRegularPrice: p.maxRegularPrice,
      maxDiscount: p.maxDiscount
    };
  });

  return (
    <main className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
           <h1 className="text-3xl font-bold text-gray-800">All Plugins</h1>
           <span className="text-sm font-medium text-gray-500">{totalCount} Results</span>
        </div>
        
        <ProductGrid 
          initialProducts={processedProducts} 
          totalCount={totalCount} 
        />
      </div>
    </main>
  );
}