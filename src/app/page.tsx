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
    const bestListing = p.listings[0];
    const lowestPrice = p.minPrice > 0 ? p.minPrice : (bestListing?.price || 0);
    const originalPrice = p.maxRegularPrice > 0 ? p.maxRegularPrice : (bestListing?.originalPrice || lowestPrice);
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
      
      {/* ✅ INCREASED WIDTH: Changed max-w-7xl to max-w-[1600px] */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 lg:px-16">

        {/* 1. HERO SECTION (Themed) */}
        <div className="mt-8 mb-16 p-12 md:p-20 bg-[#1a1a1a] rounded-[40px] shadow-2xl border border-white/5 text-center relative overflow-hidden">
           
           {/* Primary Glow Overlay */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-full bg-primary/10 blur-[120px] pointer-events-none rounded-full"></div>

           <div className="relative z-10">
             <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20 mb-6">
                Live Price Tracking Active
             </span>
             
             {/* ✅ LARGER TEXT FOR WIDE SCREEN */}
             <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-none">
               Plugin Deals <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-white">Tracker</span>
             </h1>
             
             <p className="text-[#888] font-medium text-xl max-w-3xl mx-auto leading-relaxed">
               Real-time price monitoring for the world's best audio software. <br className="hidden md:block"/> Join thousands of producers saving on every tool.
             </p>
           </div>
        </div>

        {/* 2. AI RECOMMENDATIONS */}
        <section className="mb-16">
           <AIRecommendations initialProducts={processedProducts.slice(0, 4)} /> 
        </section>

        {/* 3. MAIN PRODUCT GRID */}
        <div className="pt-4">
           <ProductGrid initialProducts={processedProducts} totalCount={totalCount} />
        </div>
      </div>
    </main>
  );
}