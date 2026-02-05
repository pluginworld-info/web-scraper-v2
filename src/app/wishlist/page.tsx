'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductGrid from '@/components/ProductGrid'; 

export default function WishlistPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ ROBUST: Safely parse local storage and filter out bad data
  const getSafeWishlistIds = () => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('wishlist_items');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Ensure we only return valid non-empty strings
      return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string' && id.trim().length > 0) : [];
    } catch (e) {
      console.error("Wishlist Parse Error:", e);
      return [];
    }
  };

  // 1. Initial Load
  useEffect(() => {
    const ids = getSafeWishlistIds();
    if (ids.length > 0) {
      fetchWishlistProducts(ids);
    } else {
      setLoading(false);
    }

    // 2. Event Listener for "Ghost" Updates
    const handleUpdate = () => {
      // Re-read storage to get the *current* valid list
      const validIds = getSafeWishlistIds();
      
      // Update state: Keep only products that are still in the validIds list
      setProducts(prev => prev.filter(p => validIds.includes(p.id)));
      
      // If we filtered everything out, ensure loading is off
      if (validIds.length === 0) setLoading(false);
    };

    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, []);

  // 3. Fetch Data
  async function fetchWishlistProducts(ids: string[]) {
    try {
      // ✅ CRITICAL FIX: Only fetch if ID is valid. 
      const validIds = ids.filter(id => id && id !== "null" && id !== "undefined");
      
      if (validIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const promises = validIds.map(id => fetch(`/api/products?id=${id}`).then(r => r.json()));
      const results = await Promise.all(promises);
      
      const foundProducts = results
        .filter(r => r && r.product) // Ensure 'product' exists
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
        <div className="min-h-screen flex items-center justify-center bg-[#111]">
            <div className="animate-pulse text-[#666] font-bold tracking-widest uppercase text-xs">Loading saved items...</div>
        </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#111] p-4 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-10 border-b border-[#333] pb-6 flex items-end justify-between">
           <div>
             <h1 className="text-3xl font-black text-white tracking-tighter">My Wishlist</h1>
             <p className="text-[#666] font-medium mt-1">Your curated list of tracked plugins.</p>
           </div>
           
           {/* ✅ DYNAMIC COUNT BADGE */}
           <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
             {products.length} Saved
           </span>
        </div>

        {products.length > 0 ? (
          <ProductGrid initialProducts={products} totalCount={products.length} />
        ) : (
          <div className="text-center py-32 bg-[#1a1a1a] rounded-3xl border border-[#333] shadow-xl">
            <div className="text-6xl mb-6 grayscale opacity-30">💔</div>
            <h2 className="text-xl font-bold text-white mb-2">Your wishlist is empty</h2>
            <p className="text-[#888] mb-8 max-w-md mx-auto text-sm">Start saving your favorite plugins to track their prices and get notified of deals.</p>
            <Link 
              href="/product" 
              // ✅ DYNAMIC BUTTON COLOR
              className="bg-primary text-white px-8 py-4 rounded-full font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              Browse Deals
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}