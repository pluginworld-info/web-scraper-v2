'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavigationProps {
  brands: string[];
  categories: string[];
}

export default function Navigation({ brands: initialBrands, categories: initialCategories }: NavigationProps) {
  const pathname = usePathname();
  const [wishlistCount, setWishlistCount] = useState(0);

  const [menuBrands, setMenuBrands] = useState<string[]>(initialBrands || []);
  const [menuCategories, setMenuCategories] = useState<string[]>(initialCategories || []);
  
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'PluginDeals',
    logoUrl: ''
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const metaRes = await fetch('/api/metadata');
        const metaData = await metaRes.json();
        
        if (metaData.brands?.length > 0) setMenuBrands(metaData.brands);
        if (metaData.categories?.length > 0) setMenuCategories(metaData.categories);

        const settingsRes = await fetch('/api/admin/settings');
        const settingsData = await settingsRes.json();
        
        if (settingsData && !settingsData.error) {
           setSiteSettings({
             siteName: settingsData.siteName || 'PluginDeals',
             logoUrl: settingsData.logoUrl || ''
           });
           
           if (typeof document !== 'undefined') {
             const root = document.documentElement;
             if (settingsData.primaryColor) root.style.setProperty('--primary', settingsData.primaryColor);
             if (settingsData.accentColor) root.style.setProperty('--accent', settingsData.accentColor);
           }
        }
      } catch (error) {
        console.error("Data fetch failed", error);
      }
    }
    fetchData();
  }, []);

  const updateCount = () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('wishlist_items');
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
            const validCount = ids.filter(id => typeof id === 'string' && id.trim().length > 0).length;
            setWishlistCount(validCount);
            return;
        }
      }
      setWishlistCount(0);
    } catch (e) {
      setWishlistCount(0);
    }
  };

  useEffect(() => {
    updateCount();
    window.addEventListener('wishlist-updated', updateCount);
    window.addEventListener('storage', updateCount);
    return () => {
      window.removeEventListener('wishlist-updated', updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#111] text-white shadow-xl font-sans border-b border-white/5 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* LOGO SECTION */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              {siteSettings.logoUrl ? (
                <div className="relative h-9 w-40">
                   <Image 
                     src={siteSettings.logoUrl} 
                     alt={siteSettings.siteName} 
                     fill 
                     className="object-contain object-left"
                     unoptimized 
                   />
                </div>
              ) : (
                <span className="text-2xl font-black tracking-tighter uppercase group-hover:opacity-90 transition-opacity whitespace-nowrap">
                  {siteSettings.siteName.includes(' ') ? (
                    <>
                      {siteSettings.siteName.split(' ').slice(0, -1).join(' ')}
                      <span className="text-primary"> {siteSettings.siteName.split(' ').slice(-1)}</span>
                    </>
                  ) : (
                    <>
                       {siteSettings.siteName.slice(0, Math.ceil(siteSettings.siteName.length / 2))}
                       <span className="text-primary">{siteSettings.siteName.slice(Math.ceil(siteSettings.siteName.length / 2))}</span>
                    </>
                  )}
                </span>
              )}
            </Link>
          </div>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex space-x-8 h-full items-center">
            
            <Link
              href="/"
              className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-primary flex items-center h-full border-b-2 transition-all ${
                pathname === '/' ? 'border-primary text-primary' : 'border-transparent text-gray-300'
              }`}
            >
              Home
            </Link>

            {/* BRANDS DROPDOWN */}
            <div className="group relative h-full flex items-center">
              <Link
                href="/product"
                className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-primary flex items-center gap-1 h-full border-b-2 transition-all ${
                  pathname === '/product' ? 'border-primary text-primary' : 'border-transparent text-gray-300'
                }`}
              >
                Brands
                <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </Link>
              
              <div className="absolute left-0 top-full w-56 bg-[#1a1a1a] text-gray-200 rounded-b-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 border-t-2 border-primary overflow-hidden z-50">
                <div className="max-h-80 overflow-y-auto py-2 custom-scrollbar">
                  {menuBrands.length > 0 ? menuBrands.map((brand) => (
                    <Link 
                      key={brand} 
                      href={`/product?search=${encodeURIComponent(brand)}`} 
                      className="block px-4 py-3 text-xs font-bold uppercase hover:bg-primary/10 hover:text-primary transition-colors border-b border-white/5 last:border-0"
                    >
                      {brand}
                    </Link>
                  )) : (
                      <span className="block px-4 py-2 text-xs text-gray-500 italic">No brands found</span>
                  )}
                </div>
              </div>
            </div>

            {/* CATEGORIES DROPDOWN */}
            <div className="group relative h-full flex items-center">
              <button
                className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-primary flex items-center gap-1 h-full border-b-2 transition-all ${
                  pathname.includes('category') ? 'border-primary text-primary' : 'border-transparent text-gray-300'
                }`}
              >
                Categories
                <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>

              <div className="absolute left-0 top-full w-56 bg-[#1a1a1a] text-gray-200 rounded-b-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 border-t-2 border-primary overflow-hidden z-50">
                <div className="max-h-80 overflow-y-auto py-2 custom-scrollbar">
                   {menuCategories.length > 0 ? menuCategories.map((cat) => (
                    <Link 
                      key={cat} 
                      href={`/product?search=${encodeURIComponent(cat)}`} 
                      className="block px-4 py-3 text-xs font-bold uppercase hover:bg-primary/10 hover:text-primary transition-colors border-b border-white/5 last:border-0"
                    >
                      {cat}
                    </Link>
                  )) : (
                    <span className="block px-4 py-2 text-xs text-gray-500 italic">No categories found</span>
                  )}
                </div>
              </div>
            </div>

            {/* WISHLIST (Using Accent Color) */}
            <Link
              href="/wishlist"
              className={`text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 px-4 py-1.5 rounded-full border ${
                pathname === '/wishlist'
                  ? 'text-accent border-accent bg-accent/10' 
                  : 'text-gray-300 border-white/10 hover:border-accent hover:text-accent hover:bg-accent/5'
              }`}
            >
              <div className="relative">
                <svg className="w-4 h-4" fill={wishlistCount > 0 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {wishlistCount > 0 && (
                   <span className="absolute -top-2 -right-2 bg-accent text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-lg animate-in zoom-in">
                     {wishlistCount}
                   </span>
                )}
              </div>
              Wishlist
            </Link>

            {/* ADMIN ACCESS */}
            <Link
              href="/admin"
              className="text-gray-600 hover:text-primary transition-colors ml-2"
              title="Admin Access"
            >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
            </Link>

          </nav>

          {/* MOBILE MENU */}
          <div className="md:hidden flex items-center gap-4">
             <Link href="/wishlist" className="relative text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {wishlistCount > 0 && <span className="absolute -top-1 -right-1 bg-accent w-2 h-2 rounded-full"></span>}
             </Link>
             <Link href="/admin" className="text-gray-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
             </Link>
          </div>
        </div>
      </div>
    </header>
  );
}