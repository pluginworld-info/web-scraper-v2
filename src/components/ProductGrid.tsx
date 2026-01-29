'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AlertModalTrigger from './AlertModalTrigger';
import { useAnalytics } from '@/hooks/use-analytics'; // 1. Import Hook

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
  
  // Initialize Analytics
  const { trackEvent } = useAnalytics();

  // Sync with initialProducts if they change
  useEffect(() => {
    setProducts(initialProducts);
    setDisplayCount(totalCount);
  }, [initialProducts, totalCount]);

  // Global Search Logic with Debounce & TRACKING
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

            // 2. TRACK SEARCH INTENT
            // Only track meaningful searches (> 2 chars) to save DB space
            if (search.length > 2) {
              trackEvent('SEARCH', { 
                query: search, 
                resultsCount: data.products.length 
              });
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
    }, 1000); // Increased debounce to 1s to reduce spam tracking while typing

    return () => clearTimeout(delayDebounceFn);
  }, [search, initialProducts, totalCount, trackEvent]);

  // Sort Logic
  const sortedProducts = [...products].sort((a, b) => {
    if (sort === 'price-low') return a.lowestPrice - b.lowestPrice;
    if (sort === 'rating') return parseFloat(b.avgRating) - parseFloat(a.avgRating);
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

  // Helper for tracking clicks
  const handleProductClick = (productId: string) => {
    trackEvent('CLICK', { productId, source: 'grid_view' });
  };

  // Helper for Wishlist
  const handleWishlist = (e: React.MouseEvent, productId: string) => {
    e.preventDefault(); // Prevent navigating if inside a Link
    e.stopPropagation();
    
    // Visual feedback (simple alert for now, can be a toast later)
    // In a real app, you'd update local state to fill the heart icon immediately
    const btn = e.currentTarget as HTMLButtonElement;
    btn.classList.add('text-red-500', 'fill-current');
    
    trackEvent('WISHLIST', { productId });
  };

  return (
    <div>
      {/* Search & Sort Controls */}
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
        {sortedProducts.map(product => {
          const bestListing = product.listings?.[0];
          const lowestPrice = product.lowestPrice || bestListing?.price || 0;
          const originalPrice = bestListing?.originalPrice || lowestPrice;
          
          const discount = originalPrice > lowestPrice 
            ? Math.round(((originalPrice - lowestPrice) / originalPrice) * 100) 
            : 0;

          return (
            <div key={product.id} className="group relative bg-[#1e1e1e] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-800 flex flex-col">
              
              {/* Image & Discount Badge */}
              <div className="relative aspect-square w-full overflow-hidden bg-white p-4">
                {/* 3. TRACKING: Wrap image in Link to track clicks */}
                <Link 
                   href={`/product/${product.slug}`} 
                   onClick={() => handleProductClick(product.id)}
                   className="block w-full h-full relative"
                >
                    {product.image ? (
                    <Image 
                        src={product.image} 
                        alt={product.title} 
                        fill 
                        unoptimized={true}
                        priority={true}
                        style={{ objectFit: 'contain' }}
                        className="p-4 group-hover:scale-110 transition-transform duration-500" 
                    />
                    ) : (
                    <div className="flex h-full items-center justify-center text-gray-300 font-medium italic">No Image</div>
                    )}
                </Link>

                {/* 🔴 Red Discount Capsule (Top Right) */}
                {discount > 0 && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg z-10 pointer-events-none">
                    {discount}% OFF
                  </div>
                )}

                {/* 🔵 WISHLIST BUTTON (Top Left) - New Feature */}
                <button
                    onClick={(e) => handleWishlist(e, product.id)}
                    className="absolute top-3 left-3 bg-gray-100/80 hover:bg-white text-gray-400 hover:text-red-500 p-2 rounded-full shadow-sm z-20 transition-all duration-200"
                    title="Add to Wishlist"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>

              </div>

              {/* Content Area */}
              <div className="p-5 flex-grow flex flex-col items-center text-center">
                <span className="text-[10px] font-black uppercase text-blue-500 tracking-tighter mb-1">
                  {product.brand || 'Premium Plugin'}
                </span>
                
                <Link 
                    href={`/product/${product.slug}`}
                    onClick={() => handleProductClick(product.id)}
                >
                    <h3 className="text-white font-bold text-sm mb-2 line-clamp-2 h-10 leading-tight group-hover:text-blue-400 transition-colors cursor-pointer">
                    {product.title}
                    </h3>
                </Link>

                {/* 🔴 Star Ratings (Below Title) */}
                <div className="flex items-center gap-1 mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`w-3 h-3 ${i < Math.floor(product.avgRating) ? 'fill-current' : 'text-gray-700 fill-current'}`} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                    ({product.reviews?.length || 0})
                  </span>
                </div>
                
                {/* 🔴 Pricing Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2">
                    {discount > 0 && (
                      <span className="text-gray-500 line-through text-xs font-bold">
                        ${originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-red-500 font-black text-xl tracking-tighter">
                      ${lowestPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 w-full mt-auto">
                  <Link 
                    href={`/product/${product.slug}`}
                    onClick={() => handleProductClick(product.id)}
                    className="bg-gray-400/10 hover:bg-gray-400/20 text-white text-[10px] font-black py-2.5 rounded-full transition-colors flex items-center justify-center tracking-widest uppercase"
                  >
                    View
                  </Link>
                  <AlertModalTrigger product={product} isSmall />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
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