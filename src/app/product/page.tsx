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
      listings: {
        orderBy: { price: 'asc' }, 
        take: 1
      },
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  // 3. Process Data (Optimized)
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
      {/* ✅ WIDE MODE: Increased from max-w-7xl to max-w-[1600px] */}
      <div className="max-w-[1600px] mx-auto p-4 md:p-12 lg:px-16">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-white/5 pb-8 relative">
           {/* Subtle Header Accent Glow */}
           <div className="absolute -top-10 left-0 w-64 h-32 bg-primary/5 blur-[80px] pointer-events-none"></div>

           <div className="relative z-10">
             <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
               All <span className="text-primary">Plugins</span>
             </h1>
             <p className="text-[#666] font-medium mt-2 text-lg">
               Browse {totalCount} professional deals monitored in real-time.
             </p>
           </div>
           
           {/* ✅ DYNAMIC RESULT BADGE */}
           <div className="mt-6 md:mt-0 relative z-10">
             <span className="bg-primary/10 text-primary border border-primary/20 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]">
               {totalCount} Results Found
             </span>
           </div>
        </div>
        
        {/* The ProductGrid will now automatically utilize the 1600px width 
            allowing for more columns on desktop screens. */}
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