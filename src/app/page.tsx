export const dynamic = 'force-dynamic';
export const revalidate = 0; 

import { Metadata } from 'next'; // ⚡ ADDED: Import Metadata
import AIRecommendations from '@/components/AIRecommendations';
import { prisma } from '@/lib/db/prisma';
import ProductGrid from '@/components/ProductGrid'; 

// ⚡ ADDED: Next.js Dynamic Metadata Generator for Global SEO
export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findFirst();
  
  return {
    title: settings?.metaTitle || 'Compare Plugin Deals',
    description: settings?.metaDescription || 'Real-time price monitoring from the best audio software sellers.',
    keywords: settings?.metaKeywords || 'audio plugins, vst deals, plugins',
    openGraph: {
      title: settings?.metaTitle || 'Compare Plugin Deals',
      description: settings?.metaDescription || 'Real-time price monitoring from the best audio software sellers.',
      images: settings?.heroBgUrl ? [settings.heroBgUrl] : [], // Use your hero image for social sharing links!
    }
  };
}

export default async function HomePage() {
  // ⚡ Fetch Site Settings for the Hero Section
  const settings = await prisma.siteSettings.findFirst();

  // Setup fallbacks just in case the admin hasn't filled them out yet
  const heroTagline = settings?.heroTagline || "Live Price Tracking From Around The World";
  const heroTitle = settings?.heroTitle || "Compare Plugin Deals";
  const heroSubtitle = settings?.heroSubtitle || "Real-time Price Monitoring From The World's Best Audio Software Sellers. Compare Thousands Of Plugins And Buy Smart.";
  const heroBgUrl = settings?.heroBgUrl || null;

  const totalCount = await prisma.product.count();

  const products = await prisma.product.findMany({
    take: 12, 
    include: {
      listings: {
        include: {
          retailer: true 
        },
        orderBy: { price: 'asc' },
      },
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const processedProducts = products.map(p => {
    let calculatedLowest = 0;
    
    if (p.listings && p.listings.length > 0) {
      const prices = p.listings.map(l => l.price).filter(price => price > 0);
      if (prices.length > 0) {
        calculatedLowest = Math.min(...prices);
      }
    }

    const lowestPrice = calculatedLowest > 0 ? calculatedLowest : (p.minPrice || 0);

    const bestListing = p.listings[0]; 
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
    <main className="min-h-screen pb-20">
      
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 lg:px-16">

        {/* 1. HERO SECTION (Dynamic Background & Text) */}
        <div 
          // ⚡ Removed hardcoded borders here so our dynamic style takes over
          className="mt-8 mb-16 p-12 md:p-20 rounded-[40px] shadow-2xl text-center relative overflow-hidden bg-[#1a1a1a]"
          style={{ 
            backgroundImage: heroBgUrl ? `url('${heroBgUrl}')` : 'none', 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            // ⚡ NEW: Dynamic Border Style
            borderWidth: `${settings?.heroBorderThickness ?? 1}px`,
            borderColor: settings?.heroBorderColor || 'rgba(255, 255, 255, 0.05)',
            borderStyle: 'solid'
          }}
        >
           {/* ⚡ NEW: Dynamic color tint AND Blur overlay */}
           {heroBgUrl && (
             <div 
               className="absolute inset-0 z-0" 
               style={{ 
                   backgroundColor: settings?.heroOverlayColor || 'rgba(0, 0, 0, 0.7)',
                   backdropFilter: `blur(${settings?.heroOverlayBlur ?? 2}px)`,
                   WebkitBackdropFilter: `blur(${settings?.heroOverlayBlur ?? 2}px)`
               }}
             ></div>
           )}
           
           {/* Primary Glow Overlay */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-full bg-primary/20 blur-[120px] pointer-events-none rounded-full z-0"></div>

           <div className="relative z-10">
             <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20 mb-6 backdrop-blur-md">
               {heroTagline}
             </span>
             
             <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-none" dangerouslySetInnerHTML={{ __html: heroTitle }}>
               {/* Using dangerouslySetInnerHTML allows you to inject <span className="text-primary"> into the title from the admin panel if you want to highlight a word later! */}
             </h1>
             
             <p className="text-white font-medium text-xl max-w-3xl mx-auto leading-relaxed drop-shadow-md">
               {heroSubtitle}
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