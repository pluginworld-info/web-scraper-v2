export const dynamic = 'force-dynamic';
export const revalidate = 0; 

import { prisma } from '@/lib/db/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PriceChart from '@/components/PriceChart'; 
import AlertModalTrigger from '@/components/AlertModalTrigger';
import RelatedProducts from '@/components/RelatedProducts'; 
import ReviewsSection from '@/components/ReviewsSection'; 
import TrackedLink from '@/components/TrackedLink';

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug;

  if (!slug) return notFound();

  // 1. Fetch Product
  const product = await prisma.product.findUnique({
    where: { slug: slug },
    include: {
      listings: {
        include: { 
          retailer: true, 
          history: { orderBy: { date: 'asc' } }
        },
        orderBy: { price: 'asc' } 
      },
      reviews: { 
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!product) return notFound();

  // 2. SMART PRICE LOGIC
  const bestListing = product.listings[0]; 
  const currentBestPrice = bestListing ? bestListing.price : 0;
  
  const anchorPrice = product.maxRegularPrice > 0 
    ? product.maxRegularPrice 
    : (bestListing?.originalPrice || currentBestPrice);

  const savingsAmount = Math.max(0, anchorPrice - currentBestPrice);
  const hasDiscount = savingsAmount > 0;
  
  const discountPct = anchorPrice > 0 
    ? Math.round((savingsAmount / anchorPrice) * 100) 
    : 0;

  // 3. Rating Logic
  const reviewCount = product.reviews.length;
  const averageRating = reviewCount > 0 
    ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / reviewCount 
    : 0;

  let dealStrength = "Good Deal";
  let dealColor = "bg-primary/20 text-primary border border-primary/50";
  
  if (discountPct > 70) {
    dealStrength = "🔥 Historic Low";
    dealColor = "bg-red-900/30 text-red-400 border border-red-800";
  } else if (discountPct > 50) {
    dealStrength = "⚡ Great Price";
    dealColor = "bg-orange-900/30 text-orange-400 border border-orange-800";
  }

  return (
    <main className="min-h-screen bg-[#111] pb-20">
      
      {/* ✅ WIDE CONTAINER */}
      <div className="max-w-[1400px] mx-auto p-4 md:p-12">
      
        {/* --- BACK BUTTON --- */}
        <div className="mb-10">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#aaaaaa] hover:text-primary transition-colors group"
          >
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* --- AI DEAL INSIGHT --- */}
        {hasDiscount && (
          <div className="mb-12 bg-[#1a1a1a] rounded-[32px] p-1 border border-white/5">
              <div className="bg-[#222] p-6 md:p-8 rounded-[28px] flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                      <div className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg ${dealColor}`}>
                          {dealStrength}
                      </div>
                      <span className="text-[#888] text-sm font-medium hidden lg:inline-block">
                          We found {product.listings.length} verified sellers offering this plugin.
                      </span>
                  </div>
                  <div className="flex items-center gap-10">
                      <div className="text-right hidden md:block">
                          <span className="block text-[#666] text-[10px] font-black uppercase mb-1 tracking-widest">Global Best Price</span>
                          <span className="text-white font-black text-3xl tracking-tighter">${currentBestPrice.toFixed(2)}</span>
                      </div>
                      <div className="h-12 w-px bg-white/10 hidden md:block"></div>
                      <div className="text-right">
                            <span className="block text-[#666] text-[10px] font-black uppercase mb-1 tracking-widest">Total Savings</span>
                            <span className="text-green-500 font-black text-3xl tracking-tighter">${savingsAmount.toFixed(2)}</span>
                      </div>
                  </div>
              </div>
          </div> 
        )}

        {/* --- MAIN HEADER SECTION --- */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 mb-20 items-start">
          
          {/* Product Image Section */}
          <div className="relative h-[400px] md:h-[550px] w-full bg-[#1a1a1a] rounded-[40px] overflow-hidden border border-white/5 flex items-center justify-center group shadow-2xl">
            {product.image && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <Image src={product.image} alt="" fill unoptimized className="object-cover blur-[80px] opacity-30 scale-125" />
                  <div className="absolute inset-0 bg-black/40" /> 
                </div>
            )}
            {product.image ? (
              <div className="relative z-10 w-full h-full p-8 md:p-12">
                  <Image src={product.image} alt={product.title} fill unoptimized className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" priority />
              </div>
            ) : (
              <div className="relative z-10 text-[#444] italic">No Preview Image</div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col pt-4">
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em]">
                {product.brand || 'Premium Brand'}
              </span>
              <span className="bg-white/5 text-[#888] border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em]">
                {product.category || 'Plugin'}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-6">
               <div className="flex text-yellow-500 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`w-5 h-5 ${i < Math.round(averageRating) ? "fill-current" : "text-[#333] fill-current"}`} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                  ))}
               </div>
               <span className="text-xs font-black text-[#555] uppercase tracking-widest">
                  {reviewCount} Verified Reviews
               </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-8 leading-[0.95] tracking-tighter">
              {product.title}
            </h1>

            <div className="prose prose-invert prose-lg text-[#888] mb-10 max-w-none">
              <p className="leading-relaxed font-medium text-sm md:text-base">
                {product.description || "Detailed technical description currently being optimized by the scraper engine."}
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-8 mb-12">
              <div className="flex flex-col">
                <span className="text-[#666] text-[10px] font-black uppercase mb-1 tracking-widest">Best Market Price</span>
                <div className="text-6xl md:text-7xl font-black text-red-500 tracking-tighter">${currentBestPrice.toFixed(2)}</div>
              </div>
              {hasDiscount && (
                <div className="flex flex-col bg-red-500/10 border border-red-500/20 p-4 rounded-2xl w-fit">
                  <span className="text-[#666] line-through text-lg font-bold">${anchorPrice.toFixed(2)}</span>
                  <span className="text-red-500 text-sm font-black uppercase">
                    Save {discountPct}% OFF
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-4">
               {currentBestPrice > 0 && (
                  <AlertModalTrigger product={product} currentPrice={currentBestPrice} />
               )}
            </div>
          </div>
        </div>

        {/* --- ✅ COMPARISON TABLE FIXED FOR MOBILE --- */}
        <div className="bg-[#1a1a1a] rounded-[32px] border border-white/5 overflow-hidden mb-20 shadow-2xl">
          <div className="bg-[#222] px-6 md:px-10 py-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-black text-xs md:text-sm uppercase tracking-[0.2em] text-[#888]">Verified Store Comparison</h3>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-[#555] uppercase tracking-widest hidden md:inline">Updated Live</span>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {product.listings.map((listing) => (
              // ✅ FLEX COLUMN on Mobile, ROW on Desktop
              <div key={listing.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-8 gap-5 hover:bg-white/[0.02] transition-colors">
                
                {/* Retailer Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 relative flex-shrink-0 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-white/10">
                    {listing.retailer.logo ? (
                      <Image src={listing.retailer.logo} alt={listing.retailer.name} fill className="object-contain p-2" unoptimized />
                    ) : (
                      <span className="text-lg font-black text-black">{listing.retailer.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                      <span className="font-black text-white uppercase text-base md:text-lg tracking-tight">{listing.retailer.name}</span>
                      {listing.price <= currentBestPrice && (
                        <span className="bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] px-2 py-0.5 rounded-md w-fit font-black uppercase mt-1">Best Deal</span>
                      )}
                  </div>
                </div>
                
                {/* Price & Action - ✅ Full width row on mobile */}
                <div className="flex items-center justify-between md:justify-end gap-4 md:gap-10 w-full md:w-auto">
                  <span className="font-black text-2xl md:text-3xl text-white tracking-tighter">${listing.price.toFixed(2)}</span>
                  <TrackedLink 
                    url={listing.url}
                    productId={product.id}
                    retailerId={listing.retailerId}
                    className="bg-primary text-white px-6 py-3 md:px-8 md:py-4 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest hover:opacity-90 border border-transparent hover:border-primary/50 transition-all shadow-xl shadow-primary/20"
                  >
                    Go to Store
                  </TrackedLink>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- PRICE HISTORY CHART --- */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
              <h3 className="font-black text-sm uppercase tracking-[0.2em] text-[#888]">Price Trajectory</h3>
              <div className="h-px bg-white/5 flex-grow"></div>
          </div>
          <div className="bg-[#1a1a1a] p-4 md:p-10 rounded-[40px] border border-white/5 h-[350px] md:h-[450px] shadow-2xl">
            <PriceChart history={product.listings[0]?.history || []} />
          </div>
        </div>

        {/* --- REVIEWS SECTION --- */}
        <div className="mb-20">
           <ReviewsSection productId={product.id} reviews={product.reviews || []} />
        </div>

        {/* --- RELATED DEALS --- */}
        {product.category && (
          <div className="mt-32">
            <RelatedProducts currentId={product.id} category={product.category} />
          </div>
        )}

      </div>
    </main>
  );
}