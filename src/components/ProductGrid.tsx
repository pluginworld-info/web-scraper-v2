'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; 
import { useAnalytics } from '@/hooks/use-analytics';
import Link from 'next/link';
import Image from 'next/image';

interface ProductGridProps {
  initialProducts: any[];
  totalCount: number;
}

export default function ProductGrid({ initialProducts, totalCount }: ProductGridProps) {
  const searchParams = useSearchParams(); 
  const initialSearch = searchParams.get('search') || ''; 

  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState(initialSearch); 
  const [sort, setSort] = useState('newest');
  const [displayCount, setDisplayCount] = useState(totalCount);
  
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    setProducts(initialProducts);
    setDisplayCount(totalCount);
  }, [initialProducts, totalCount]);

  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null && urlSearch !== search) {
        setSearch(urlSearch);
        setLoading(true); 
    } else if (urlSearch === null && search !== '') {
        setSearch('');
        setLoading(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (search.length > 0 || (search === '' && products.length !== initialProducts.length)) {
        setLoading(true);
        try {
          const query = search ? `search=${encodeURIComponent(search)}` : '';
          const res = await fetch(`/api/products?${query}`);
          const data = await res.json();
          
          if (data.products) {
            setProducts(data.products);
            setDisplayCount(data.products.length); 
            if (search.length > 2) {
              trackEvent('SEARCH', { query: search, resultsCount: data.products.length });
            }
          }
        } catch (err) {
          console.error("Search failed:", err);
        } finally {
          setLoading(false);
        }
      } else {
        if (search === '') {
            setProducts(initialProducts);
            setDisplayCount(totalCount);
            setLoading(false);
        }
      }
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [search, initialProducts, totalCount, trackEvent]);

  const sortedProducts = [...products].sort((a, b) => {
    const priceA = a.lowestPrice || a.minPrice || 0;
    const priceB = b.lowestPrice || b.minPrice || 0;
    const ratingA = parseFloat(a.avgRating || "0");
    const ratingB = parseFloat(b.avgRating || "0");

    if (sort === 'price-low') return priceA - priceB;
    if (sort === 'rating') return ratingB - ratingA;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  async function loadMore() {
    if (loadingMore) return;
    
    setLoadingMore(true);
    try {
      const skip = products.length;
      const response = await fetch(`/api/products?skip=${skip}&search=${encodeURIComponent(search)}`); 
      const data = await response.json();
      
      if (data.products) {
        setProducts((prev) => [...prev, ...data.products]);
      }
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setLoadingMore(false);
    }
  }

  const handleProductClick = (productId: string) => {
    trackEvent('CLICK', { productId, source: 'grid_view' });
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-12 justify-between">
        <div className="relative w-full md:w-1/3">
          <input 
            type="text" 
            placeholder="Search brands, categories..." 
            className="p-3 pl-10 bg-[#1a1a1a] border border-[#333] text-white rounded-xl w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium placeholder-gray-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="absolute left-3 top-3.5 h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select 
          className="p-3 bg-[#1a1a1a] border border-[#333] text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none cursor-pointer font-bold text-xs uppercase tracking-widest"
          onChange={(e) => setSort(e.target.value)}
          value={sort}
        >
          <option value="newest">Newest Added</option>
          <option value="price-low">Lowest Price</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {/* RELATIVE CONTAINER FOR GRID & LOADING OVERLAY */}
      <div className="relative min-h-[400px]">
        
        {/* LOADING OVERLAY */}
        {loading && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-3xl transition-all duration-300">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4 shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]"></div>
                    <span className="text-white font-black tracking-[0.2em] uppercase text-xs animate-pulse">Searching...</span>
                </div>
            </div>
        )}

        {/* ✅ GRID UPDATED with INLINE CARD LOGIC */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 transition-all duration-500 ease-out ${loading ? 'opacity-20 scale-[0.98] blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
            {sortedProducts.length > 0 ? (
                sortedProducts.map(product => {
                  
                  // --- BADGE LOGIC ---
                  // 1. HOT BADGE: More than 25 global views
                  const isHot = product.viewCount > 25;

                  // 2. LOWEST PRICE BADGE:
                  //    - Must be equal/lower than all-time low
                  //    - Must have fluctuated > 10 times (to prove it's an active deal)
                  const isLowestPrice = (product.lowestPrice > 0) && (product.lowestPrice <= product.minPrice) && (product.priceChangeCount >= 10);

                  return (
                    <div 
                      key={product.id} 
                      onClick={() => handleProductClick(product.id)}
                      className="group relative bg-[#1a1a1a] border border-[#333] hover:border-primary/50 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 flex flex-col cursor-pointer"
                    >
                      {/* IMAGE CONTAINER */}
                      <div className="relative aspect-[4/3] bg-[#000] overflow-hidden">
                          {product.image ? (
                            <Image 
                              src={product.image} 
                              alt={product.title} 
                              fill 
                              className="object-contain p-8 transition-transform duration-700 group-hover:scale-110"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#333]">No Image</div>
                          )}

                          {/* ✅ DYNAMIC CAPSULES */}
                          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                            {isHot && (
                              <div className="bg-orange-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1">
                                  🔥 HOT DEAL
                              </div>
                            )}
                            {isLowestPrice && (
                              <div className="bg-green-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                  📉 ALL TIME LOW
                              </div>
                            )}
                          </div>

                          {/* OVERLAY ACTIONS */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-sm">
                            <span className="bg-white text-black px-6 py-3 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-primary hover:text-white transition-colors transform translate-y-4 group-hover:translate-y-0 duration-300">
                                View Deal
                            </span>
                          </div>
                      </div>

                      {/* DETAILS */}
                      <div className="p-6 flex flex-col flex-grow">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-2 py-1 rounded border border-primary/20">
                                {product.brand || 'Unknown'}
                            </span>
                            <div className="flex items-center gap-1 text-[#666]">
                                <span className="text-yellow-500">★</span>
                                <span className="text-xs font-bold text-white">{product.avgRating || '0.0'}</span>
                                <span className="text-[10px]">({product.reviewCount || 0})</span>
                            </div>
                          </div>

                          <h3 className="text-white font-bold text-lg leading-tight mb-4 line-clamp-2 group-hover:text-primary transition-colors">
                            {product.title}
                          </h3>

                          <div className="mt-auto pt-4 border-t border-[#333] flex items-center justify-between">
                            <div className="flex flex-col">
                                {product.originalPrice > product.lowestPrice && (
                                  <span className="text-[#666] text-xs line-through font-medium mb-0.5">
                                      ${product.originalPrice.toFixed(2)}
                                  </span>
                                )}
                                <span className="text-2xl font-black text-white">
                                  ${(product.lowestPrice || 0).toFixed(2)}
                                </span>
                            </div>
                            
                            {product.maxDiscount > 0 && (
                                <div className="text-right">
                                  <span className="block text-green-500 font-black text-lg">
                                      -{product.maxDiscount}%
                                  </span>
                                  <span className="text-[#444] text-[10px] font-bold uppercase tracking-wide">
                                      Discount
                                  </span>
                                </div>
                            )}
                          </div>
                      </div>
                      
                      {/* Full Card Link Overlay */}
                      <Link href={`/product/${product.slug}`} className="absolute inset-0 z-20" onClick={() => handleProductClick(product.id)}>
                        <span className="sr-only">View {product.title}</span>
                      </Link>
                    </div>
                  );
                })
            ) : (
                !loading && (
                    <div className="col-span-full text-center py-20 bg-[#1a1a1a] rounded-3xl border border-[#333] border-dashed">
                        <p className="text-gray-500 text-lg font-medium">No products found matching "{search}"</p>
                        <button 
                          onClick={() => setSearch('')} 
                          className="mt-4 text-primary font-black uppercase text-xs tracking-widest hover:opacity-80 transition-opacity underline decoration-2 underline-offset-4"
                        >
                          Clear Search
                        </button>
                    </div>
                )
            )}
        </div>
      </div>

      {/* Load More Button */}
      {products.length < displayCount && !loading && (
        <div className="mt-20 flex justify-center pb-12">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="group relative inline-flex items-center justify-center gap-3 px-12 py-4 font-black text-white transition-all duration-300 bg-primary rounded-full hover:opacity-90 hover:scale-105 tracking-widest text-xs uppercase shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loadingMore ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                LOADING...
              </>
            ) : (
              'LOAD MORE PLUGINS'
            )}
          </button>
        </div>
      )}
    </div>
  ); 
}