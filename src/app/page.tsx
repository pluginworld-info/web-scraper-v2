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
          retailer: true 
        },
        orderBy: { price: 'asc' },
        take: 1 
      },
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const processedProducts = products.map(p => {
    // ⚡ SMART PRICE LOGIC
    const bestListing = p.listings[0];
    
    const lowestPrice = p.minPrice > 0 
      ? p.minPrice 
      : (bestListing?.price || 0);
      
    const originalPrice = p.maxRegularPrice > 0 
      ? p.maxRegularPrice 
      : (bestListing?.originalPrice || lowestPrice);

    // Calculate rating
    const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "0.0";
    const reviewCount = p.reviews.length;

    return { 
      ...p, 
      lowestPrice, 
      originalPrice, 
      avgRating, 
      reviewCount,
      maxDiscount: p.maxDiscount,
      brand: p.brand || "Unknown", 
      category: p.category || "Plugin"
    };
  });

  return (
    // ✅ REMOVED bg-gray-50 (Global CSS is black)
    <main className="p-4 min-h-screen">
      
      {/* 1. HEADER SECTION (Dark Mode) */}
      <div className="mb-8 p-10 bg-[#222222] rounded-3xl shadow-sm border border-[#333] text-center">
        <h1 className="text-5xl font-black text-white mb-3 tracking-tighter">Plugin Deals Tracker</h1>
        <p className="text-[#aaaaaa] font-medium">Real-time price monitoring for the world's best audio software.</p>
      </div>

      {/* 2. AI RECOMMENDATIONS */}
      <section className="mb-12">
         {/* Using first 4 products for now */}
         <AIRecommendations initialProducts={processedProducts.slice(0, 4)} /> 
      </section>

      {/* 3. MAIN PRODUCT GRID */}
      <ProductGrid initialProducts={processedProducts} totalCount={totalCount} />
    </main>
  );
}