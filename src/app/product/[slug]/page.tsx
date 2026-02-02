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

  // 2. Smart Price Logic
  const bestListing = product.listings[0];
  const currentBestPrice = product.minPrice > 0 ? product.minPrice : (bestListing?.price || 0);
  const anchorPrice = product.maxRegularPrice > 0 ? product.maxRegularPrice : (bestListing?.originalPrice || currentBestPrice);
  const discountPct = product.maxDiscount > 0 ? product.maxDiscount : Math.round(((anchorPrice - currentBestPrice) / anchorPrice) * 100);
  const hasDiscount = anchorPrice > currentBestPrice;
  const savingsAmount = anchorPrice - currentBestPrice;

  // 3. Rating Logic
  const reviewCount = product.reviews.length;
  const averageRating = reviewCount > 0 
    ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / reviewCount 
    : 0;

  // AI Deal Strength
  let dealStrength = "Good Deal";
  let dealColor = "bg-blue-900/30 text-blue-400 border border-blue-800";
  
  if (discountPct > 70) {
    dealStrength = "🔥 Historic Low";
    dealColor = "bg-red-900/30 text-red-400 border border-red-800";
  } else if (discountPct > 50) {
    dealStrength = "⚡ Great Price";
    dealColor = "bg-orange-900/30 text-orange-400 border border-orange-800";
  }

  return (
    <main className="min-h-screen bg-[#111] pb-20">
      
      <div className="max-w-6xl mx-auto p-4 md:p-8">
      
        {/* --- BACK BUTTON --- */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#aaaaaa] hover:text-white transition-colors group"
          >
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* --- AI DEAL INSIGHT --- */}
        {hasDiscount && (
          <div className="mb-10 bg-[#222222] rounded-2xl p-1 border border-[#333]">
              <div className="bg-[#2a2a2a] p-4 md:p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                      <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${dealColor}`}>
                          {dealStrength}
                      </div>
                      <span className="text-[#aaaaaa] text-sm font-medium hidden md:inline-block">
                          We found {product.listings.length} sellers for this item.
                      </span>
                  </div>
                  <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                          <span className="block text-[#aaaaaa] text-[10px] font-black uppercase">Global Best Price</span>
                          <span className="text-white font-black text-2xl">${currentBestPrice.toFixed(2)}</span>
                      </div>
                      <div className="h-10 w-px bg-[#444] hidden md:block"></div>
                      <div className="text-right">
                            <span className="block text-[#aaaaaa] text-[10px] font-black uppercase">Total Savings</span>
                            <span className="text-green-400 font-black text-2xl">${savingsAmount.toFixed(2)}</span>
                      </div>
                  </div>
              </div>
          </div> 
        )}

        {/* --- MAIN HEADER SECTION --- */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          
          {/* Product Image Section */}
          <div className="relative h-[450px] w-full bg-[#222222] rounded-3xl overflow-hidden border border-[#333] flex items-center justify-center group">
            {product.image && (
                <div className="absolute inset-0 z-0">
                  <Image 
                    src={product.image} 
                    alt="" 
                    fill 
                    unoptimized={true}
                    className="object-cover blur-2xl opacity-40 scale-110"
                  />
                  <div className="absolute inset-0 bg-black/20" /> 
                </div>
            )}

            {product.image ? (
              <div className="relative z-10 w-full h-full p-8">
                  <Image 
                  src={product.image} 
                  alt={product.title} 
                  fill 
                  unoptimized={true} 
                  className="object-contain drop-shadow-2xl"
                  priority={true}
                  />
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-[#aaaaaa] italic">
                 <svg className="w-16 h-16 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 No Preview Image
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-blue-900/50 text-blue-200 border border-blue-800 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter">
                {product.brand || 'Premium Brand'}
              </span>
              <span className="bg-[#333] text-[#aaaaaa] border border-[#444] px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter">
                {product.category || 'Plugin'}
              </span>
            </div>

            {/* Star Rating Display */}
            <div className="flex items-center gap-2 mb-3">
               <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                     <svg 
                       key={i} 
                       className={`w-4 h-4 ${i < Math.round(averageRating) ? "fill-current" : "text-[#444] fill-current"}`} 
                       viewBox="0 0 20 20"
                     >
                       <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                     </svg>
                  ))}
               </div>
               <span className="text-xs font-bold text-[#666] uppercase tracking-wider">
                  {reviewCount > 0 ? `${reviewCount} Reviews` : 'No Reviews Yet'}
               </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-[1.1] tracking-tight">
              {product.title}
            </h1>

            <div className="prose prose-sm text-[#aaaaaa] mb-8 max-w-none">
              <p className="leading-relaxed">
                {product.description || "Detailed technical description currently being optimized by the scraper engine."}
              </p>
            </div>

            <div className="flex items-end gap-5 mb-10">
              <div className="flex flex-col">
                <span className="text-[#aaaaaa] text-[10px] font-black uppercase mb-1">Best Market Price</span>
                <div className="text-5xl font-black text-red-600 tracking-tighter">${currentBestPrice.toFixed(2)}</div>
              </div>
              {hasDiscount && (
                <div className="flex flex-col mb-1">
                  <span className="text-[#666] line-through text-lg font-bold">${anchorPrice.toFixed(2)}</span>
                  <span className="text-red-500 text-xs font-black uppercase">
                    Save {discountPct}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-4">
               {currentBestPrice > 0 && (
                  <AlertModalTrigger 
                    product={product} 
                    currentPrice={currentBestPrice}
                  />
               )}
            </div>
          </div>
        </div>

        {/* --- COMPARISON TABLE --- */}
        <div className="bg-[#222222] rounded-2xl border border-[#333] overflow-hidden mb-16">
          <div className="bg-[#2a2a2a] px-8 py-5 border-b border-[#333] flex justify-between items-center">
            <h3 className="font-black text-sm uppercase tracking-widest text-[#aaaaaa]">Verified Store Comparison</h3>
            <span className="text-[10px] font-bold text-[#666] uppercase">Prices updated live</span>
          </div>
          <div className="divide-y divide-[#333]">
            {product.listings.map((listing) => (
              <div key={listing.id} className="flex items-center justify-between p-6 hover:bg-[#2a2a2a] transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 relative flex-shrink-0 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                    {/* ✅ FIX: unoptimized={true} ensures external logos load */}
                    {listing.retailer.logo ? (
                      <Image 
                        src={listing.retailer.logo} 
                        alt={listing.retailer.name} 
                        fill 
                        className="object-contain p-1"
                        unoptimized={true}
                      />
                    ) : (
                      <span className="text-xs font-bold text-black">{listing.retailer.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                      <span className="font-black text-white uppercase text-sm tracking-tight">{listing.retailer.name}</span>
                      {listing.price === currentBestPrice && (
                      <span className="bg-green-900/30 border border-green-800 text-green-400 text-[9px] px-2 py-0.5 rounded w-fit font-black uppercase mt-1">Best Deal</span>
                      )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <span className="font-black text-xl text-white">${listing.price.toFixed(2)}</span>
                  
                  {/* Tracked Link for Analytics */}
                  <TrackedLink 
                    url={listing.url}
                    productId={product.id}
                    retailerId={listing.retailerId}
                    className="bg-black text-white px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-[#333] border border-[#333] transition whitespace-nowrap"
                  >
                    Go to Store
                  </TrackedLink>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- PRICE HISTORY CHART --- */}
        <div className="mb-16">
          <h3 className="font-black text-sm uppercase tracking-widest text-[#aaaaaa] mb-6">Price Trajectory</h3>
          <div className="bg-[#222222] p-8 rounded-2xl border border-[#333] h-96">
            <PriceChart history={product.listings[0]?.history || []} />
          </div>
        </div>

        {/* --- REVIEWS SECTION --- */}
        <div className="mb-16">
           <ReviewsSection productId={product.id} reviews={product.reviews || []} />
        </div>

        {/* --- RELATED DEALS --- */}
        {product.category && (
          <div className="mt-20">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="font-black text-sm uppercase tracking-widest text-[#aaaaaa]">Similar Deals</h3>
              <div className="h-px bg-[#333] flex-grow"></div>
            </div>
            <RelatedProducts currentId={product.id} category={product.category} />
          </div>
        )}

      </div>
    </main>
  );
}