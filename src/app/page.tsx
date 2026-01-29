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
        include: {
          retailer: true // ✅ INCLUDES RETAILER LOGO & NAME
        },
        orderBy: { price: 'asc' } 
      },
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const processedProducts = products.map(p => {
    const bestListing = p.listings[0];
    const lowestPrice = bestListing?.price || 0;
    
    // Logic: Fallback to sale price if originalPrice is missing/zero
    const originalPrice = (bestListing?.originalPrice && bestListing?.originalPrice > lowestPrice) 
      ? bestListing.originalPrice 
      : lowestPrice;
    
    const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "0.0";
    const reviewCount = p.reviews.length;

    return { 
      ...p, 
      lowestPrice, 
      originalPrice, 
      avgRating, 
      reviewCount,
      brand: p.brand || "Unknown", // ✅ Explicit defaults
      category: p.category || "Plugin"
    };
  });

  return (
    <main className="p-4 bg-gray-50 min-h-screen">
      
      {/* 1. HEADER SECTION (Moved to Top) */}
      <div className="mb-8 p-10 bg-white rounded-3xl shadow-sm border border-gray-100 text-center">
        <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter">Plugin Deals Tracker</h1>
        <p className="text-gray-500 font-medium">Real-time price monitoring for the world's best audio software.</p>
      </div>

      {/* 2. AI RECOMMENDATIONS */}
      <section className="mb-12">
         {/* Passing the first 4 products as "Featured" for now */}
         <AIRecommendations initialProducts={processedProducts.slice(0, 4)} /> 
      </section>

      {/* 3. MAIN PRODUCT GRID */}
      <ProductGrid initialProducts={processedProducts} totalCount={totalCount} />
    </main>
  );
}