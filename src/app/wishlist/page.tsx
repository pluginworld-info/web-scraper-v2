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
      const validIds = getSafeWishlistIds();
      setProducts(prev => prev.filter(p => validIds.includes(p.id)));
      if (validIds.length === 0) setLoading(false);
    };

    window.addEventListener('wishlist-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate); // Sync across tabs
    return () => {
      window.removeEventListener('wishlist-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // 3. Fetch Data
  async function fetchWishlistProducts(ids: string[]) {
    try {
      const validIds = ids.filter(id => id && id !== "null" && id !== "undefined");
      
      if (validIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const promises = validIds.map(id => fetch(`/api/products?id=${id}`).then(r => r.json()));
      const results = await Promise.all(promises);
      
      const foundProducts = results
        .filter(r => r && r.product) 
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
            <div className="animate-pulse text-[#666] font-black tracking-[0.2em] uppercase text-xs">Synchronizing Vault...</div>
        </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#111] pb-20">
      {/* ✅ WIDE MODE: Increased to max-w-[1600px] */}
      <div className="max-w-[1600px] mx-auto p-4 md:p-12 lg:px-16">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-white/5 pb-8 relative">
           {/* Subtle Accent Glow */}
           <div className="absolute -top-10 left-0 w-64 h-32 bg-primary/5 blur-[80px] pointer-events-none"></div>

           <div className="relative z-10">
             <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
               My <span className="text-primary">Wishlist</span>
             </h1>
             <p className="text-[#666] font-medium mt-2 text-lg">
               Your personal selection of high-performance tools.
             </p>
           </div>
           
           {/* ✅ DYNAMIC COUNT BADGE */}
           <div className="mt-6 md:mt-0 relative z-10">
             <span className="bg-primary/10 text-primary border border-primary/20 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]">
               {products.length} Items Saved
             </span>
           </div>
        </div>

        {products.length > 0 ? (
          <div className="pt-2">
            <ProductGrid initialProducts={products} totalCount={products.length} />
          </div>
        ) : (
          <div className="text-center py-40 bg-[#1a1a1a] rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden">
            {/* Background Decorative Element */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="text-7xl mb-8 grayscale opacity-20">📦</div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Your vault is empty</h2>
              <p className="text-[#666] mb-10 max-w-md mx-auto text-base font-medium leading-relaxed">
                Save plugins while you browse to track price drops and receive exclusive deal alerts.
              </p>
              <Link 
                href="/product" 
                className="bg-primary text-white px-10 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] hover:opacity-90 transition-all shadow-xl shadow-primary/20 inline-block hover:scale-105"
              >
                Start Tracking
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}