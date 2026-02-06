'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface AIRecommendationsProps {
  initialProducts: any[];
}

export default function AIRecommendations({ initialProducts }: AIRecommendationsProps) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState("Curating best value deals...");
  const [isPersonalized, setIsPersonalized] = useState(false);

  const generateRecommendations = useCallback((isRefresh = false) => {
    if (loading) return;

    const history = typeof window !== 'undefined' ? localStorage.getItem('plugin_history') : null;
    const lastSearch = typeof window !== 'undefined' ? localStorage.getItem('last_search') : null;
    const wishlist = typeof window !== 'undefined' ? localStorage.getItem('wishlist_items') : null;

    if (history || lastSearch || wishlist || isRefresh) {
      setLoading(true);
      setInsight(isRefresh ? "Re-calibrating model with latest signals..." : "Cross-referencing your wishlist...");

      setTimeout(() => {
        if (isRefresh) {
             setProducts(prev => [...prev].sort(() => Math.random() - 0.5));
        }

        let newInsight = "Selected based on your interest in Audio Plugins"; 
        
        if (wishlist && JSON.parse(wishlist).length > 0) {
            const count = JSON.parse(wishlist).length;
            newInsight = `Found similar deals based on your ${count} wishlist items`;
        } else if (lastSearch) {
            newInsight = `Found top rated deals matching "${lastSearch}"`;
        } else if (history) {
             newInsight = "Personalized based on your recent viewing habits";
        }

        setInsight(newInsight);
        setIsPersonalized(true);
        setLoading(false);
      }, 1500);
    }
  }, [loading]);

  useEffect(() => {
    generateRecommendations(false);
  }, []);

  if ((!products || products.length === 0) && !loading) return null;

  return (
    <section className="bg-gradient-to-br from-primary/20 via-[#1a1a1a] to-primary/5 rounded-[40px] p-1 shadow-2xl overflow-hidden relative border border-primary/20 transition-all duration-500 ease-in-out">
      
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 opacity-40 blur-3xl animate-pulse"></div>

      <div className="bg-[#1a1a1a]/90 backdrop-blur-3xl rounded-[38px] p-8 md:p-10 relative z-10 h-full transition-all duration-500 ease-in-out">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl border border-primary/20 transition-all duration-700 ease-in-out ${loading ? 'bg-primary/20 shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)] scale-110' : 'bg-primary/10'}`}>
              {/* ✅ STATIC: Main icon does NOT spin */}
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                AI Smart Picks
                {isPersonalized && !loading && (
                    <span className="text-[10px] bg-accent text-white px-3 py-1 rounded-full shadow-lg shadow-accent/30 animate-in zoom-in duration-500 font-black tracking-widest">
                        PERSONALIZED
                    </span>
                )}
              </h2>
              <p className="text-[#888] text-sm font-medium tracking-wide flex items-center gap-2 mt-1">
                 {loading ? (
                   <span className="animate-pulse text-primary">Processing realtime signals...</span>
                 ) : (
                   insight
                 )}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => generateRecommendations(true)}
            disabled={loading}
            className="text-[10px] uppercase font-black tracking-[0.2em] text-primary hover:text-white flex items-center gap-2 opacity-60 hover:opacity-100 transition-all duration-300 ease-in-out disabled:opacity-20 group"
          >
            {/* ✅ RESTORED: Added animate-spin back here only */}
            <svg className={`w-4 h-4 transition-transform duration-700 ease-in-out ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'RE-CALIBRATING...' : 'REFRESH ENGINE'}
          </button>
        </div>

        {/* --- PRODUCT GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {loading ? (
             [...Array(4)].map((_, i) => (
               <div key={i} className="bg-white/5 border border-white/5 rounded-[32px] p-6 h-72 animate-pulse flex flex-col gap-4">
                 <div className="bg-white/5 h-40 rounded-2xl w-full"></div>
                 <div className="bg-white/5 h-4 rounded w-3/4"></div>
                 <div className="bg-white/5 h-4 rounded w-1/2 mt-auto"></div>
               </div>
             ))
          ) : (
             products.map((product) => (
              <Link 
                key={product.id} 
                href={`/product/${product.slug}`}
                className="group relative bg-[#111] hover:bg-[#151515] border border-white/5 hover:border-primary/40 rounded-[32px] p-6 transition-all duration-500 ease-in-out flex flex-col hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10"
              >
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out translate-y-2 group-hover:translate-y-0">
                    <span className="bg-primary text-white text-[9px] font-black px-2 py-1 rounded shadow-xl border border-white/20 uppercase tracking-tighter">
                        98% MATCH
                    </span>
                </div>

                <div className="relative h-36 w-full mb-5 rounded-2xl overflow-hidden bg-[#0a0a0a] p-4 border border-white/5 transition-all duration-500 ease-in-out">
                  {product.image ? (
                    <Image 
                      src={product.image} 
                      alt={product.title} 
                      fill 
                      unoptimized 
                      className="object-contain transition-all duration-500 ease-in-out grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#333] text-xs italic">No Image</div>
                  )}
                </div>
                
                <h3 className="font-black text-white text-xs truncate mb-3 group-hover:text-primary transition-colors duration-300 ease-in-out uppercase tracking-tight">
                  {product.title}
                </h3>
                
                <div className="mt-auto flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#555] uppercase font-black tracking-widest">Best Market Price</span>
                    <span className="text-white font-black text-base tracking-tighter">
                      ${product.lowestPrice?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 ease-in-out text-primary shadow-lg shadow-primary/5 group-hover:shadow-primary/20">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}