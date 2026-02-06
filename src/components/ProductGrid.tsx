'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; 
import { useAnalytics } from '@/hooks/use-analytics';
import ProductCard from './ProductCard'; 

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

        {/* ✅ GRID UPDATED: Max 3 columns on large screens, 1 on mobile */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500 ease-out ${loading ? 'opacity-20 scale-[0.98] blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
            {sortedProducts.length > 0 ? (
                sortedProducts.map(product => (
                <ProductCard 
                    key={product.id} 
                    product={product} 
                    onClick={handleProductClick} 
                />
                ))
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