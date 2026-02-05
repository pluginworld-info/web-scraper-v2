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
    <main className="min-h-screen bg-[#111] pb-20">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* HEADER */}
        <div className="flex items-end justify-between mb-10 border-b border-[#333] pb-6">
           <div>
             <h1 className="text-3xl font-black text-white tracking-tighter">All Plugins</h1>
             <p className="text-[#666] font-medium mt-1">Browse the latest deals and drops.</p>
           </div>
           
           {/* ✅ DYNAMIC RESULT BADGE */}
           <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
             {totalCount} Results
           </span>
        </div>
        
        <ProductGrid 
          initialProducts={processedProducts} 
          totalCount={totalCount} 
        />
      </div>
    </main>
  );
}