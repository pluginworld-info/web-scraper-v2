'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AlertModalTrigger from './AlertModalTrigger';

// Define the interface to fix the TypeScript error on the Page files
interface ProductGridProps {
  initialProducts: any[];
  totalCount: number;
}

export default function ProductGrid({ initialProducts, totalCount }: ProductGridProps) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  // Filter & Sort Logic (Now runs on the local state 'products')
  const filtered = products
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price-low') return a.lowestPrice - b.lowestPrice;
      if (sort === 'rating') return parseFloat(b.avgRating) - parseFloat(a.avgRating);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  // Load More Logic
  async function loadMore() {
    setLoading(true);
    try {
      const skip = products.length;
      const response = await fetch(`/api/products?skip=${skip}`); 
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

  return (
    <div>
      {/* Search & Sort Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between">
        <input 
          type="text" 
          placeholder="Search plugins..." 
          className="p-3 bg-white border border-gray-200 rounded-lg w-full md:w-1/3 focus:ring-2 focus:ring-purple-500 outline-none transition"
          onChange={(e) => setSearch(e.target.value)}
        />
        <select 
          className="p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
          onChange={(e) => setSort(e.target.value)}
          value={sort}
        >
          <option value="newest">Newest Added</option>
          <option value="price-low">Lowest Price</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(product => {
          const bestListing = product.listings.find((l: any) => l.price === product.lowestPrice);
          const originalPrice = bestListing?.originalPrice || product.lowestPrice;
          const discount = originalPrice > product.lowestPrice 
            ? Math.round(((originalPrice - product.lowestPrice) / originalPrice) * 100) 
            : 0;

          return (
            <div key={product.id} className="group relative bg-[#1e1e1e] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-800 flex flex-col">
              
              {/* Image Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
                {product.image ? (
                  <Image 
                    src={product.image} 
                    alt={product.title} 
                    fill 
                    unoptimized={true} // 🔴 FIXED: Prevents low-quality/blurry images
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-600 font-medium">No Image</div>
                )}

                {discount > 0 && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg">
                    {discount}% Off
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="p-6 flex-grow flex flex-col items-center text-center">
                <h3 className="text-white font-bold text-lg mb-4 line-clamp-2 h-14 leading-tight">
                  {product.title}
                </h3>
                
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2">
                    {discount > 0 && (
                      <span className="text-gray-500 line-through text-sm">
                        ${originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-red-500 font-black text-xl">
                      ${product.lowestPrice.toFixed(2)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <p className="text-gray-400 text-[11px] mt-1 font-medium tracking-tight">
                      Save ${(originalPrice - product.lowestPrice).toFixed(0)}$
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-auto">
                  <Link 
                    href={`/product/${product.slug}`}
                    className="bg-gray-400/20 hover:bg-gray-400/30 text-white text-[10px] font-black py-2.5 rounded-full transition-colors flex items-center justify-center tracking-widest"
                  >
                    VIEW DEAL
                  </Link>
                  <AlertModalTrigger product={product} isSmall />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- LOAD MORE BUTTON --- */}
      {products.length < totalCount && (
        <div className="mt-16 flex justify-center pb-12">
          <button
            onClick={loadMore}
            disabled={loading}
            className="group relative inline-flex items-center justify-center px-10 py-4 font-black text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 tracking-widest text-xs"
          >
            {loading ? "LOADING..." : "LOAD MORE PLUGINS"}
          </button>
        </div>
      )}
    </div>
  );
}