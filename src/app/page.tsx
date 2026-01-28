export const dynamic = 'force-dynamic';
export const revalidate = 0; // Force fresh data to fix the "mismatch" issue

import AIRecommendations from '@/components/AIRecommendations';
import { prisma } from '@/lib/db/prisma';
import ProductGrid from '@/components/ProductGrid';

export default async function HomePage() {
  // 1. Fetch total count for pagination logic
  const totalCount = await prisma.product.count();

  // 2. Fetch Products
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
      <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Plugin Deals Tracker</h1>
        <p className="text-gray-500">Live prices from your favorite retailers</p>
      </div>

      <div className="mb-8">
         <AIRecommendations /> 
      </div>

      {/* Added totalCount here */}
      <ProductGrid initialProducts={processedProducts} totalCount={totalCount} />
    </main>
  );
}