'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavigationProps {
  brands: string[];
  categories: string[];
}

export default function Navigation({ brands, categories }: NavigationProps) {
  const pathname = usePathname();
  const [wishlistCount, setWishlistCount] = useState(0);

  // Helper to read storage
  const updateCount = () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('wishlist_items');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        setWishlistCount(Array.isArray(ids) ? ids.length : 0);
      } catch (e) {
        setWishlistCount(0);
      }
    } else {
      setWishlistCount(0);
    }
  };

  // Setup Listeners
  useEffect(() => {
    // 1. Check on load
    updateCount();

    // 2. Listen for custom event (We will trigger this in WishlistToggle)
    window.addEventListener('wishlist-updated', updateCount);
    
    // 3. Listen for cross-tab updates
    window.addEventListener('storage', updateCount);

    return () => {
      window.removeEventListener('wishlist-updated', updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#111] text-white shadow-md font-sans border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* LOGO */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-black tracking-tighter uppercase group-hover:opacity-90 transition-opacity">
                Plugin<span className="text-blue-500">Deals</span>
              </span>
            </Link>
          </div>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex space-x-8 h-full items-center">
            
            {/* 1. HOME */}
            <Link
              href="/"
              className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-blue-400 flex items-center h-full ${
                pathname === '/' ? 'text-blue-500' : 'text-gray-300'
              }`}
            >
              Home
            </Link>

            {/* 2. BRANDS (Hover Dropdown) */}
            <div className="group relative h-full flex items-center">
              <Link
                href="/product"
                className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-blue-400 flex items-center gap-1 ${
                  pathname === '/product' ? 'text-blue-500' : 'text-gray-300'
                }`}
              >
                Brands
                <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </Link>
              
              <div className="absolute left-0 top-full w-56 bg-[#1a1a1a] text-gray-200 rounded-b-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 border-t-2 border-blue-600 overflow-hidden z-50">
                <div className="max-h-80 overflow-y-auto py-2 custom-scrollbar">
                  {brands.length > 0 ? brands.map((brand) => (
                    <Link 
                      key={brand} 
                      href={`/product?search=${encodeURIComponent(brand)}`} 
                      className="block px-4 py-3 text-xs font-bold uppercase hover:bg-white/5 hover:text-blue-400 transition-colors border-b border-white/5 last:border-0"
                    >
                      {brand}
                    </Link>
                  )) : (
                     <span className="block px-4 py-2 text-xs text-gray-500 italic">No brands found</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. CATEGORIES (Hover Dropdown) */}
            <div className="group relative h-full flex items-center">
              <Link
                href="/product"
                className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-blue-400 flex items-center gap-1 ${
                  pathname === '/product' ? 'text-blue-500' : 'text-gray-300'
                }`}
              >
                Categories
                <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </Link>

              <div className="absolute left-0 top-full w-56 bg-[#1a1a1a] text-gray-200 rounded-b-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 border-t-2 border-blue-600 overflow-hidden z-50">
                <div className="max-h-80 overflow-y-auto py-2 custom-scrollbar">
                   {categories.length > 0 ? categories.map((cat) => (
                    <Link 
                      key={cat} 
                      href={`/product?search=${encodeURIComponent(cat)}`} 
                      className="block px-4 py-3 text-xs font-bold uppercase hover:bg-white/5 hover:text-blue-400 transition-colors border-b border-white/5 last:border-0"
                    >
                      {cat}
                    </Link>
                  )) : (
                    <span className="block px-4 py-2 text-xs text-gray-500 italic">No categories found</span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. WISHLIST TAB (Dynamic Red) */}
            <Link
              href="/wishlist"
              className={`text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-2 px-3 py-1 rounded-full ${
                pathname === '/wishlist' || wishlistCount > 0 
                  ? 'text-red-500 bg-red-500/10' 
                  : 'text-gray-300 hover:text-red-400'
              }`}
            >
              <div className="relative">
                <svg className="w-4 h-4" fill={wishlistCount > 0 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              Wishlist
              {wishlistCount > 0 && (
                <span className="bg-red-600 text-white text-[9px] font-black px-1.5 h-4 min-w-[16px] flex items-center justify-center rounded-full shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </Link>

          </nav>

          {/* MOBILE MENU ICON */}
          <div className="md:hidden">
            <button className="text-gray-200 hover:text-white p-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}