'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ProductGrid({ initialProducts }: { initialProducts: any[] }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest'); // 'price-low', 'rating', 'newest'

  // Filter & Sort Logic
  const filtered = initialProducts
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price-low') return a.lowestPrice - b.lowestPrice;
      if (sort === 'rating') return parseFloat(b.avgRating) - parseFloat(a.avgRating);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
        <input 
          type="text" 
          placeholder="Search plugins..." 
          className="p-3 border rounded-lg w-full md:w-1/3"
          onChange={(e) => setSearch(e.target.value)}
        />
        <select 
          className="p-3 border rounded-lg"
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest Added</option>
          <option value="price-low">Lowest Price</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map(product => (
          <div key={product.id} className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden flex flex-col">
            
            {/* Image */}
            <div className="relative h-48 w-full bg-gray-100">
              {product.image && (
                <Image src={product.image} alt={product.title} fill className="object-cover" />
              )}
            </div>

            {/* Content */}
            <div className="p-4 flex-grow flex flex-col">
              <div className="flex justify-between items-start">
                 <h3 className="font-bold text-lg line-clamp-2">{product.title}</h3>
                 <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">⭐ {product.avgRating}</span>
              </div>
              
              <div className="mt-auto pt-4">
                <div className="text-2xl font-bold text-green-600 mb-3">
                  ${product.lowestPrice}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Req #3: View Product */}
                  <Link 
                    href={`/product/${product.slug}`}
                    className="bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700 font-medium"
                  >
                    View Deal
                  </Link>
                  
                  {/* Req #4: Create Alert */}
                  <button 
                    onClick={() => alert("Open your Firestore Modal Here")}
                    className="border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-50"
                  >
                    🔔 Alert
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}