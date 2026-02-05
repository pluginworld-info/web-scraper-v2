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
    <main className="min-h-screen bg-[#111] pb-20">
      
      <div className="max-w-7xl mx-auto p-4 md:p-8">

        {/* 1. HERO SECTION (Themed) */}
        <div className="mb-12 p-10 bg-[#1a1a1a] rounded-3xl shadow-2xl border border-[#333] text-center relative overflow-hidden">
           
           {/* Subtle Background Glow using Primary Variable */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-full bg-primary/5 blur-3xl pointer-events-none rounded-full"></div>

           <div className="relative z-10">
             {/* ✅ DYNAMIC BADGE */}
             <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 mb-4">
                Live Price Tracking
             </span>
             
             <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tighter">
               Plugin Deals <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-white">Tracker</span>
             </h1>
             
             <p className="text-[#888] font-medium text-lg max-w-2xl mx-auto">
               Real-time price monitoring for the world's best audio software. Never miss a drop again.
             </p>
           </div>
        </div>

        {/* 2. AI RECOMMENDATIONS */}
        <section className="mb-12">
           <AIRecommendations initialProducts={processedProducts.slice(0, 4)} /> 
        </section>

        {/* 3. MAIN PRODUCT GRID */}
        <ProductGrid initialProducts={processedProducts} totalCount={totalCount} />
      </div>
    </main>
  );
}