export const dynamic = 'force-dynamic';
export const revalidate = 0; 

import { prisma } from '@/lib/db/prisma';
import ProductGrid from '@/components/ProductGrid';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function AllProductsPage({ searchParams }: PageProps) {
  // 1. Extract Search Query
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';

  // 2. Build Filter Clause
  const whereClause = search ? {
    OR: [
      { title: { contains: search, mode: 'insensitive' as const } },
      { brand: { contains: search, mode: 'insensitive' as const } },
      { category: { contains: search, mode: 'insensitive' as const } },
    ]
  } : {};

  // 3. Fetch Total Count (Filtered)
  const totalCount = await prisma.product.count({ where: whereClause });

  // 4. Fetch Products (Filtered)
  const products = await prisma.product.findMany({
    where: whereClause,
    take: 12,
    include: {
      listings: {
        include: { retailer: true }, // Include retailer for logos/links
        orderBy: { price: 'asc' },
        // Removed 'take: 1' to ensure we find the real lowest price from all listings
      },
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  // 5. Process Data (Price Fix applied)
  const processedProducts = products.map(p => {
    // ✅ Calculate Real Lowest Price
    let calculatedLowest = 0;
    if (p.listings && p.listings.length > 0) {
       const prices = p.listings.map(l => l.price).filter(price => price > 0);
       if (prices.length > 0) calculatedLowest = Math.min(...prices);
    }

    // Prioritize calculated price over cached 'minPrice'
    const lowestPrice = calculatedLowest > 0 ? calculatedLowest : (p.minPrice || 0);

    const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "N/A";

    return { 
      ...p, 
      lowestPrice, 
      avgRating,
      maxRegularPrice: p.maxRegularPrice,
      maxDiscount: p.maxDiscount,
      brand: p.brand || "Unknown",
      category: p.category || "Plugin"
    };
  });

  return (
    <main className="min-h-screen bg-[#111] pb-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-8 md:py-12">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 border-b border-white/5 pb-6 md:pb-8 relative gap-6">
            
           {/* Header Glow */}
           <div className="absolute -top-10 left-0 w-48 md:w-64 h-32 bg-primary/5 blur-[60px] md:blur-[80px] pointer-events-none"></div>

           <div className="relative z-10">
             {/* ✅ DYNAMIC TITLE based on Search */}
             <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">
               {search ? (
                 <>Results for <span className="text-primary">"{search}"</span></>
               ) : (
                 <>All <span className="text-primary">Plugins</span></>
               )}
             </h1>
             <p className="text-[#666] font-medium mt-2 text-sm sm:text-base md:text-lg max-w-xl">
               {search 
                 ? `Found ${totalCount} results matching your search.` 
                 : `Browse ${totalCount} professional deals monitored in real-time.`
               }
             </p>
           </div>
           
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