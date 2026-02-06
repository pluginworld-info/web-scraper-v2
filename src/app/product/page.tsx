export const dynamic = 'force-dynamic';
export const revalidate = 0; // Forces fresh data on every visit

import { prisma } from '@/lib/db/prisma';
import ProductGrid from '@/components/ProductGrid';

export default async function AllProductsPage() {
  // 1. Get total count
  const totalCount = await prisma.product.count();

  // 2. Fetch products
  const products = await prisma.product.findMany({
    take: 12,
    include: {
      listings: {
        orderBy: { price: 'asc' }, 
        take: 1
      },
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  // 3. Process Data
  const processedProducts = products.map(p => {
    const lowestPrice = p.minPrice > 0 
      ? p.minPrice 
      : (p.listings[0]?.price || 0);

    const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "N/A";

    return { 
      ...p, 
      lowestPrice, 
      avgRating,
      maxRegularPrice: p.maxRegularPrice,
      maxDiscount: p.maxDiscount
    };
  });

  return (
    <main className="min-h-screen bg-[#111] pb-20">
      {/* ✅ RESPONSIVE PADDING: 
         - Mobile: px-4 (16px) for edge-to-edge feel
         - Tablet: px-8 (32px)
         - Desktop: px-16 (64px) for wide breathing room
      */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-8 md:py-12">
        
        {/* HEADER */}
        {/* ✅ FLEX: Stacked (col) on mobile, Row on desktop
           ✅ GAP: Adds space between title and badge on mobile
        */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 border-b border-white/5 pb-6 md:pb-8 relative gap-6">
           
           {/* Subtle Header Accent Glow */}
           <div className="absolute -top-10 left-0 w-48 md:w-64 h-32 bg-primary/5 blur-[60px] md:blur-[80px] pointer-events-none"></div>

           <div className="relative z-10">
             {/* ✅ SCALED TEXT: 3xl on mobile -> 5xl on desktop */}
             <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">
               All <span className="text-primary">Plugins</span>
             </h1>
             <p className="text-[#666] font-medium mt-2 text-sm sm:text-base md:text-lg max-w-xl">
               Browse {totalCount} professional deals monitored in real-time.
             </p>
           </div>
           
           {/* ✅ BADGE: Aligns left on mobile, right (via parent justify-between) on desktop */}
           <div className="relative z-10 self-start md:self-auto">
             <span className="bg-primary/10 text-primary border border-primary/20 px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] whitespace-nowrap">
               {totalCount} Results
             </span>
           </div>
        </div>
        
        {/* GRID SECTION */}
        <div className="pt-2">
            <ProductGrid 
              initialProducts={processedProducts} 
              totalCount={totalCount} 
            />
        </div>
      </div>
    </main>
  );
}