// src/app/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0; 

import AIRecommendations from '@/components/AIRecommendations';
import { prisma } from '@/lib/db/prisma';
import ProductGrid from '@/components/ProductGrid';

export default async function HomePage() {
  const totalCount = await prisma.product.count();

  const products = await prisma.product.findMany({
    take: 12, 
    include: {
      listings: {
        orderBy: { price: 'asc' } // Ensure the first listing is the cheapest
      },
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const processedProducts = products.map(p => {
    const bestListing = p.listings[0];
    const lowestPrice = bestListing?.price || 0;
    // Logic: Fallback to sale price if originalPrice is missing
    const originalPrice = bestListing?.originalPrice || lowestPrice;
    
    const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "0.0";
    const reviewCount = p.reviews.length;

    return { ...p, lowestPrice, originalPrice, avgRating, reviewCount };
  });

  return (
    <main className="p-4 bg-gray-50 min-h-screen">
      {/* AI Section at the Top */}
      <section className="mb-12">
         <AIRecommendations initialProducts={processedProducts.slice(0, 4)} /> 
      </section>

      <div className="mb-12 p-10 bg-white rounded-3xl shadow-sm border border-gray-100 text-center">
        <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter">Plugin Deals Tracker</h1>
        <p className="text-gray-500 font-medium">Real-time price monitoring for the world's best audio software.</p>
      </div>

      <ProductGrid initialProducts={processedProducts} totalCount={totalCount} />
    </main>
  );
}