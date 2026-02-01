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
        orderBy: { price: 'asc' },
        take: 1 // We only need the top listing for the logo, prices come from cache
      },
      reviews: true
    },
    // SORTING: In the future, you can change this to: orderBy: { maxDiscount: 'desc' }
    orderBy: { updatedAt: 'desc' }
  });

  const processedProducts = products.map(p => {
    // ⚡ SMART PRICE LOGIC:
    // Use cached fields. Fallback to first listing if cache is empty (legacy support).
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
      // Pass the discount % so grid cards can show "🔥 80% OFF"
      maxDiscount: p.maxDiscount,
      brand: p.brand || "Unknown", 
      category: p.category || "Plugin"
    };
  });

  return (
    <main className="p-4 bg-gray-50 min-h-screen">
      
      {/* 1. HEADER SECTION */}
      <div className="mb-8 p-10 bg-white rounded-3xl shadow-sm border border-gray-100 text-center">
        <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter">Plugin Deals Tracker</h1>
        <p className="text-gray-500 font-medium">Real-time price monitoring for the world's best audio software.</p>
      </div>

      {/* 2. AI RECOMMENDATIONS */}
      <section className="mb-12">
         {/* We pass the first 4 products. 
             Tip: You could create a separate DB query here to fetch "orderBy: { maxDiscount: 'desc' }" 
             to show the REAL best deals in this carousel! */}
         <AIRecommendations initialProducts={processedProducts.slice(0, 4)} /> 
      </section>

      {/* 3. MAIN PRODUCT GRID */}
      <ProductGrid initialProducts={processedProducts} totalCount={totalCount} />
    </main>
  );
} 