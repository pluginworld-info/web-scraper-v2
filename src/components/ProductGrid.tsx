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
  const [search, setSearch] = useState(initialSearch); 
  const [sort, setSort] = useState('newest');
  const [displayCount, setDisplayCount] = useState(totalCount);
  
  const { trackEvent } = useAnalytics();

  // Sync props
  useEffect(() => {
    setProducts(initialProducts);
    setDisplayCount(totalCount);
  }, [initialProducts, totalCount]);

  // ✅ LISTEN TO URL CHANGES (Header Dropdowns)
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    // If URL param exists and is different, update search AND trigger loading
    if (urlSearch !== null && urlSearch !== search) {
        setSearch(urlSearch);
        setLoading(true); // <--- Show blur immediately
    } else if (urlSearch === null && search !== '') {
        setSearch('');
        setLoading(true);
    }
  }, [searchParams]);

  // Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      // If we have a search term OR if we are resetting to empty (and previously had a search)
      if (search.length > 0 || (search === '' && products.length !== initialProducts.length)) {
        setLoading(true);
        try {
          // If search is empty, fetch default list, else fetch search results
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
        // Reset to initial if needed
        if (search === '') {
            setProducts(initialProducts);
            setDisplayCount(totalCount);
            setLoading(false);
        }
      }
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [search, initialProducts, totalCount, trackEvent]);

  // Sort Logic
  const sortedProducts = [...products].sort((a, b) => {
    const priceA = a.lowestPrice || a.minPrice || 0;
    const priceB = b.lowestPrice || b.minPrice || 0;
    const ratingA = parseFloat(a.avgRating || "0");
    const ratingB = parseFloat(b.avgRating || "0");

    if (sort === 'price-low') return priceA - priceB;
    if (sort === 'rating') return ratingB - ratingA;
    // Default: Newest
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Load More Logic
  async function loadMore() {
    // Don't set main loading to true here, usually we want a spinner on the button only
    // But for simplicity, we can just fetch
    try {
      const skip = products.length;
      const response = await fetch(`/api/products?skip=${skip}&search=${encodeURIComponent(search)}`); 
      const data = await response.json();
      
      if (data.products) {
        setProducts((prev) => [...prev, ...data.products]);
      }
    } catch (error) {
      console.error("Failed to load more products:", error);
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
            className="p-3 pl-10 bg-[#1a1a1a] border border-gray-800 text-white rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none transition font-medium placeholder-gray-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select 
          className="p-3 bg-[#1a1a1a] border border-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-medium text-sm"
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
        
        {/* ✅ LOADING OVERLAY */}
        {loading && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl transition-all duration-300">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <span className="text-white font-bold tracking-widest uppercase text-sm animate-pulse">Searching...</span>
                </div>
            </div>
        )}

        {/* Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 transition-opacity duration-300 ${loading ? 'opacity-20' : 'opacity-100'}`}>
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
                    <div className="col-span-full text-center py-20">
                        <p className="text-gray-400 text-lg font-medium">No products found matching "{search}"</p>
                        <button onClick={() => setSearch('')} className="mt-4 text-blue-500 font-bold hover:underline">Clear Search</button>
                    </div>
                )
            )}
        </div>
      </div>

      {/* Load More */}
      {products.length < displayCount && !loading && (
        <div className="mt-20 flex justify-center pb-12">
          <button
            onClick={loadMore}
            className="group relative inline-flex items-center justify-center px-12 py-4 font-black text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-700 tracking-widest text-xs uppercase"
          >
            LOAD MORE PLUGINS
          </button>
        </div>
      )}
    </div>
  );
}