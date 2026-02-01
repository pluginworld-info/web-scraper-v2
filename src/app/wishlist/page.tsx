'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductGrid from '@/components/ProductGrid'; 

export default function WishlistPage() {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to sync state with localStorage
  const refreshWishlist = () => {
    const saved = localStorage.getItem('wishlist_items');
    if (saved) {
      const ids = JSON.parse(saved);
      setWishlistIds(ids);
      return ids;
    }
    return [];
  };

  // 1. Load IDs on mount AND Listen for Updates (Instant Removal)
  useEffect(() => {
    const ids = refreshWishlist();
    if (ids.length > 0) {
      fetchWishlistProducts(ids);
    } else {
      setLoading(false);
    }

    // ✅ NEW: Listen for "wishlist-updated" event (triggered by the Toggle button)
    // This allows the item to disappear instantly without refreshing the page
    const handleUpdate = () => {
      const currentIds = refreshWishlist();
      setProducts(prevProducts => prevProducts.filter(p => currentIds.includes(p.id)));
    };

    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, []);

  // 2. Fetch data
  async function fetchWishlistProducts(ids: string[]) {
    try {
      const promises = ids.map(id => fetch(`/api/products?id=${id}`).then(r => r.json()));
      const results = await Promise.all(promises);
      
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
        // ✅ Dark Mode Loading
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="animate-pulse text-gray-500 font-bold tracking-widest uppercase text-sm">Loading saved items...</div>
        </div>
    );
  }

  return (
    // ✅ Dark Mode Background
    <main className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 border-b border-gray-800 pb-5">
           <h1 className="text-3xl font-black text-white mb-2 tracking-tight">My Wishlist</h1>
           <p className="text-gray-400 font-medium">{products.length} items saved</p>
        </div>

        {products.length > 0 ? (
          <ProductGrid initialProducts={products} totalCount={products.length} />
        ) : (
          // ✅ Dark Mode Empty State
          <div className="text-center py-20 bg-[#1e1e1e] rounded-3xl border border-gray-800 shadow-xl">
            <div className="text-6xl mb-6 opacity-50">💔</div>
            <h2 className="text-xl font-bold text-white mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Start saving your favorite plugins to track their prices and get notified of deals.</p>
            <Link 
              href="/product" 
              className="bg-blue-600 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-900/20"
            >
              Browse Deals
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}