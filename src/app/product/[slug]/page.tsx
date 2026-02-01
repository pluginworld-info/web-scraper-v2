export const dynamic = 'force-dynamic';
export const revalidate = 0; 

import { prisma } from '@/lib/db/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PriceChart from '@/components/PriceChart'; 
import AlertModalTrigger from '@/components/AlertModalTrigger';
import RelatedProducts from '@/components/RelatedProducts'; 

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug;

  if (!slug) return notFound();

  // 1. Fetch Product with SMART PRICE fields and Listings
  const product = await prisma.product.findUnique({
    where: { slug: slug },
    include: {
      listings: {
        include: {
          retailer: true, 
          history: { orderBy: { date: 'asc' } }
        },
        orderBy: { price: 'asc' } 
      }
    }
  });

  if (!product) return notFound();

  // 2. LOGIC: Use the Smart Cache for Global Stats
  // If cache is 0 (new import), fall back to the best listing
  const bestListing = product.listings[0];
  
  const currentBestPrice = product.minPrice > 0 ? product.minPrice : (bestListing?.price || 0);
  const anchorPrice = product.maxRegularPrice > 0 ? product.maxRegularPrice : (bestListing?.originalPrice || currentBestPrice);
  const discountPct = product.maxDiscount > 0 ? product.maxDiscount : Math.round(((anchorPrice - currentBestPrice) / anchorPrice) * 100);
  
  const hasDiscount = anchorPrice > currentBestPrice;
  const savingsAmount = anchorPrice - currentBestPrice;

  // AI Logic: Determine Deal Strength
  let dealStrength = "Good Deal";
  let dealColor = "bg-blue-100 text-blue-700";
  
  if (discountPct > 70) {
    dealStrength = "🔥 Historic Low";
    dealColor = "bg-red-100 text-red-700";
  } else if (discountPct > 50) {
    dealStrength = "⚡ Great Price";
    dealColor = "bg-orange-100 text-orange-700";
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      
      {/* --- BACK BUTTON --- */}
      <div className="mb-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors group"
        >
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Plugins
        </Link>
      </div>

      {/* --- 🧠 AI DEAL INSIGHT (The "Smart Price" Section) --- */}
      {hasDiscount && (
        <div className="mb-10 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-1 shadow-lg shadow-gray-200">
            <div className="bg-white/5 p-4 md:p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${dealColor}`}>
                        {dealStrength}
                    </div>
                    <span className="text-gray-300 text-sm font-medium hidden md:inline-block">
                        We found {product.listings.length} sellers for this item.
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                        <span className="block text-gray-400 text-[10px] font-black uppercase">Global Best Price</span>
                        <span className="text-white font-black text-2xl">${currentBestPrice.toFixed(2)}</span>
                    </div>
                    <div className="h-10 w-px bg-white/10 hidden md:block"></div>
                    <div className="text-right">
                         <span className="block text-gray-400 text-[10px] font-black uppercase">Total Savings</span>
                         <span className="text-green-400 font-black text-2xl">${savingsAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MAIN HEADER SECTION --- */}
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        {/* Product Image */}
        <div className="relative h-[450px] w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8 border border-gray-100 flex items-center justify-center">
          {product.image ? (
            <Image 
              src={product.image} 
              alt={product.title} 
              fill 
              unoptimized={true} 
              className="object-contain p-6"
              priority={true}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 italic">
               <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
               No Preview Image
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
              {product.brand || 'Premium Brand'}
            </span>
            <span className="bg-gray-800 text-gray-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
              {product.category || 'Plugin'}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-[1.1] tracking-tight">
            {product.title}
          </h1>

          <div className="prose prose-sm text-gray-500 mb-8 max-w-none">
            <p className="leading-relaxed">
              {product.description || "Detailed technical description currently being optimized by the scraper engine."}
            </p>
          </div>

          {/* Pricing Row (Uses Smart Cache) */}
          <div className="flex items-end gap-5 mb-10">
            <div className="flex flex-col">
              <span className="text-gray-400 text-[10px] font-black uppercase mb-1">Best Market Price</span>
              <div className="text-5xl font-black text-red-600 tracking-tighter">${currentBestPrice.toFixed(2)}</div>
            </div>
            {hasDiscount && (
              <div className="flex flex-col mb-1">
                <span className="text-gray-400 line-through text-lg font-bold">${anchorPrice.toFixed(2)}</span>
                <span className="text-red-500 text-xs font-black uppercase">
                  Save {discountPct}%
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-4">
              <AlertModalTrigger product={product} />
          </div>
        </div>
      </div>

      {/* --- COMPARISON TABLE (Raw Data) --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-16">
        <div className="bg-gray-50 px-8 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-black text-sm uppercase tracking-widest text-gray-700">Verified Store Comparison</h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Prices updated live</span>
        </div>
        <div className="divide-y divide-gray-100">
          {product.listings.map((listing) => (
            <div key={listing.id} className="flex items-center justify-between p-6 hover:bg-gray-50/50 transition">
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="w-10 h-10 relative flex-shrink-0 bg-white rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden">
                  {listing.retailer.logo ? (
                    <Image src={listing.retailer.logo} alt={listing.retailer.name} fill className="object-contain p-1" />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">{listing.retailer.name.charAt(0)}</span>
                  )}
                </div>
                {/* Name */}
                <div className="flex flex-col">
                    <span className="font-black text-gray-900 uppercase text-sm tracking-tight">{listing.retailer.name}</span>
                    {/* Badge: Shows "Cheapest" if this listing matches global minPrice */}
                    {listing.price === currentBestPrice && (
                    <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded w-fit font-black uppercase mt-1">Best Deal</span>
                    )}
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <span className="font-black text-xl text-gray-900">${listing.price.toFixed(2)}</span>
                <a 
                  href={listing.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-black text-white px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition shadow-md whitespace-nowrap"
                >
                  Go to Store
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- PRICE HISTORY CHART --- */}
      <div className="mb-16">
        <h3 className="font-black text-sm uppercase tracking-widest text-gray-700 mb-6">Price Trajectory</h3>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 h-96">
          <PriceChart history={product.listings[0]?.history || []} />
        </div>
      </div>

      {/* --- RELATED DEALS --- */}
      {product.category && (
        <div className="mt-20">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="font-black text-sm uppercase tracking-widest text-gray-700">Similar Deals</h3>
            <div className="h-px bg-gray-200 flex-grow"></div>
          </div>
          <RelatedProducts currentId={product.id} category={product.category} />
        </div>
      )}

    </div>
  );
}