'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProductGrid from '@/components/ProductGrid'; // Reuse your grid!

export default function WishlistPage() {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Load IDs from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wishlist_items');
    if (saved) {
      const ids = JSON.parse(saved);
      setWishlistIds(ids);
      if (ids.length > 0) {
        fetchWishlistProducts(ids);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // 2. Fetch the actual product data for these IDs
  // We reuse the existing API but pass a comma-separated list of IDs
  async function fetchWishlistProducts(ids: string[]) {
    try {
      // Note: We need to update the API route to handle ?ids=... or loop fetches
      // For efficiency, let's loop fetch for this MVP or update the API later.
      // A simple way is to fetch "all" and filter client side, or better:
      // Let's rely on the API. For now, we will fetch individual items or use search.
      
      // OPTIMIZED: Let's assume we create a bulk fetch endpoint later. 
      // For now, let's fetch them one by one (acceptable for small wishlists)
      // OR better: Update /api/products to accept ?ids=1,2,3
      
      const promises = ids.map(id => fetch(`/api/products?id=${id}`).then(r => r.json()));
      const results = await Promise.all(promises);
      
      // Filter out failures and flatten
      const foundProducts = results
        .filter(r => r.product)
        .map(r => r.product);
        
      setProducts(foundProducts);
    } catch (error) {
      console.error("Failed to load wishlist", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-pulse text-gray-400 font-bold">Loading your saved items...</div>
        </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
           <h1 className="text-3xl font-black text-gray-900 mb-2">My Wishlist</h1>
           <p className="text-gray-500">{products.length} items saved</p>
        </div>

        {products.length > 0 ? (
          <ProductGrid initialProducts={products} totalCount={products.length} />
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-8">Start saving your favorite plugins to track their prices.</p>
            <Link 
              href="/product" 
              className="bg-blue-600 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest hover:bg-blue-700 transition"
            >
              Browse Deals
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}