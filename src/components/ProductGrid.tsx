'use client';

import { useState, useEffect } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import ProductCard from './ProductCard'; // ✅ Uses the new component

interface ProductGridProps {
  initialProducts: any[];
  totalCount: number;
}

export default function ProductGrid({ initialProducts, totalCount }: ProductGridProps) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [displayCount, setDisplayCount] = useState(totalCount);
  
  const { trackEvent } = useAnalytics();

  // Sync props
  useEffect(() => {
    setProducts(initialProducts);
    setDisplayCount(totalCount);
  }, [initialProducts, totalCount]);

  // Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (search.length > 0) {
        setLoading(true);
        try {
          const res = await fetch(`/api/products?search=${encodeURIComponent(search)}`);
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
        setProducts(initialProducts);
        setDisplayCount(totalCount);
      }
    }, 1000);

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
    setLoading(true);
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
      setLoading(false);
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
            placeholder="Search thousands of plugins..." 
            className="p-3 pl-10 bg-white border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select 
          className="p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-medium text-sm text-gray-700"
          onChange={(e) => setSort(e.target.value)}
          value={sort}
        >
          <option value="newest">Newest Added</option>
          <option value="price-low">Lowest Price</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {sortedProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onClick={handleProductClick} 
          />
        ))}
      </div>

      {/* Load More */}
      {products.length < displayCount && (
        <div className="mt-20 flex justify-center pb-12">
          <button
            onClick={loadMore}
            disabled={loading}
            className="group relative inline-flex items-center justify-center px-12 py-4 font-black text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 tracking-widest text-xs uppercase"
          >
            {loading ? "FETCHING..." : "LOAD MORE PLUGINS"}
          </button>
        </div>
      )}
    </div>
  );
}