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

  // ✅ 1. Reusable Logic Function
  const generateRecommendations = useCallback((isRefresh = false) => {
    // Prevent double-clicks
    if (loading) return;

    // Check for local history & wishlist data
    const history = typeof window !== 'undefined' ? localStorage.getItem('plugin_history') : null;
    const lastSearch = typeof window !== 'undefined' ? localStorage.getItem('last_search') : null;
    const wishlist = typeof window !== 'undefined' ? localStorage.getItem('wishlist_items') : null;

    // Only run if user has data OR if they explicitly clicked refresh
    if (history || lastSearch || wishlist || isRefresh) {
      setLoading(true);
      
      // Dynamic loading text based on action
      setInsight(isRefresh ? "Re-calibrating model with latest signals..." : "Cross-referencing your wishlist...");

      // Simulate AI Processing Delay
      setTimeout(() => {
        // --- LOGIC: SIMULATE NEW RESULTS ---
        // If refreshing, shuffle the products to show "new" options
        if (isRefresh) {
             setProducts(prev => [...prev].sort(() => Math.random() - 0.5));
        }

        // --- LOGIC: DETERMINE INSIGHT TEXT ---
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
      }, 1500); // 1.5s delay for effect
    }
  }, [loading]); // Dependencies

  // 2. Run on Mount
  useEffect(() => {
    generateRecommendations(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If no initial products and no loading state, hide.
  if ((!products || products.length === 0) && !loading) return null;

  return (
    <section className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] rounded-2xl p-1 shadow-2xl overflow-hidden relative border border-indigo-500/30">
      
      {/* Animated Gradient Border Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-20 blur-xl animate-pulse"></div>

      <div className="bg-[#0f0f16]/80 backdrop-blur-xl rounded-xl p-6 md:p-8 relative z-10 h-full">
        
        {/* --- HEADER WITH AI ANIMATION --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border border-indigo-500/30 transition-colors duration-500 ${loading ? 'bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-indigo-500/10'}`}>
              {/* Custom AI Chip Icon */}
              <svg className={`w-6 h-6 text-indigo-400 ${loading ? 'animate-spin-slow' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                AI Smart Picks
                {isPersonalized && !loading && (
                    <span className="text-[9px] bg-indigo-500 text-white px-2 py-0.5 rounded-full shadow-lg shadow-indigo-500/50 animate-fade-in">
                        Personalized
                    </span>
                )}
              </h2>
              {/* Typewriter-ish Insight Text */}
              <p className="text-indigo-300 text-xs font-medium tracking-wide flex items-center gap-2 min-h-[1.5em]">
                 {loading ? (
                   <span className="animate-pulse">Processing realtime signals...</span>
                 ) : (
                   insight
                 )}
              </p>
            </div>
          </div>
          
          {/* ✅ 3. WORKING BUTTON */}
          <button 
            onClick={() => generateRecommendations(true)}
            disabled={loading}
            className="text-[10px] uppercase font-bold text-indigo-400 hover:text-white flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed group"
          >
            <svg className={`w-3 h-3 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Analyzing...' : 'Refresh Suggestions'}
          </button>
        </div>

        {/* --- PRODUCT GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {loading ? (
             // SKELETON LOADER (While AI "Thinks")
             [...Array(4)].map((_, i) => (
               <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 h-64 animate-pulse flex flex-col gap-3">
                 <div className="bg-white/5 h-32 rounded-xl w-full"></div>
                 <div className="bg-white/5 h-4 rounded w-3/4"></div>
                 <div className="bg-white/5 h-4 rounded w-1/2 mt-auto"></div>
               </div>
             ))
          ) : (
             // ACTUAL PRODUCTS
             products.map((product) => (
              <Link 
                key={product.id} 
                href={`/product/${product.slug}`}
                className="group relative bg-[#15151e] hover:bg-[#1a1a24] border border-white/5 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-300 flex flex-col hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/20"
              >
                {/* Match Score Badge */}
                <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg border border-indigo-400">
                        98% MATCH
                    </span>
                </div>

                <div className="relative h-32 w-full mb-4 rounded-xl overflow-hidden bg-[#0a0a0e] p-2 border border-white/5">
                  {product.image ? (
                    <Image 
                      src={product.image} 
                      alt={product.title} 
                      fill 
                      unoptimized={true}
                      className="object-contain group-hover:scale-110 transition duration-500 saturate-0 group-hover:saturate-100" 
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-700 text-xs">No Preview</div>
                  )}
                </div>
                
                <h3 className="font-bold text-gray-300 text-xs truncate mb-2 group-hover:text-white transition-colors">
                  {product.title}
                </h3>
                
                <div className="mt-auto flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 uppercase font-bold">Best Price</span>
                    <span className="text-white font-black text-sm text-shadow-glow">
                      ${product.lowestPrice?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors text-indigo-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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