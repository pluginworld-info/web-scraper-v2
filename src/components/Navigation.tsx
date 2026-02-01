'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationProps {
  brands: string[];
  categories: string[];
}

export default function Navigation({ brands, categories }: NavigationProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#555555] text-white shadow-md font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* LOGO */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-black tracking-tighter uppercase group-hover:opacity-90 transition-opacity">
                Plugin<span className="text-blue-400">Deals</span>
              </span>
            </Link>
          </div>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex space-x-8 h-full items-center">
            
            {/* 1. HOME */}
            <Link
              href="/"
              className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-blue-300 flex items-center h-full ${
                pathname === '/' ? 'text-blue-400' : 'text-gray-200'
              }`}
            >
              Home
            </Link>

            {/* 2. BRANDS (Hover Dropdown) */}
            <div className="group relative h-full flex items-center">
              {/* Point to /product to avoid 404 */}
              <Link
                href="/product"
                className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-blue-300 flex items-center gap-1 ${
                  pathname === '/product' ? 'text-blue-400' : 'text-gray-200'
                }`}
              >
                Brands
                <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </Link>
              
              {/* Dropdown Menu */}
              <div className="absolute left-0 top-full w-56 bg-white text-gray-800 rounded-b-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 border-t-2 border-blue-500 overflow-hidden z-50">
                <div className="max-h-80 overflow-y-auto py-2">
                  {brands.length > 0 ? brands.map((brand) => (
                    <Link 
                      key={brand} 
                      href={`/product?search=${encodeURIComponent(brand)}`} 
                      className="block px-4 py-2 text-xs font-bold uppercase hover:bg-gray-100 hover:text-blue-600 transition-colors border-b border-gray-50 last:border-0"
                    >
                      {brand}
                    </Link>
                  )) : (
                     <span className="block px-4 py-2 text-xs text-gray-400 italic">No brands found</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. CATEGORIES (Hover Dropdown) */}
            <div className="group relative h-full flex items-center">
              <Link
                href="/product"
                className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-blue-300 flex items-center gap-1 ${
                  pathname === '/product' ? 'text-blue-400' : 'text-gray-200'
                }`}
              >
                Categories
                <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </Link>

              {/* Dropdown Menu */}
              <div className="absolute left-0 top-full w-56 bg-white text-gray-800 rounded-b-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 border-t-2 border-blue-500 overflow-hidden z-50">
                <div className="max-h-80 overflow-y-auto py-2">
                   {categories.length > 0 ? categories.map((cat) => (
                    <Link 
                      key={cat} 
                      href={`/product?search=${encodeURIComponent(cat)}`} 
                      className="block px-4 py-2 text-xs font-bold uppercase hover:bg-gray-100 hover:text-blue-600 transition-colors border-b border-gray-50 last:border-0"
                    >
                      {cat}
                    </Link>
                  )) : (
                    <span className="block px-4 py-2 text-xs text-gray-400 italic">No categories found</span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. WISHLIST TAB */}
            <Link
              href="/wishlist"
              className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-red-400 flex items-center gap-1 ${
                pathname === '/wishlist' ? 'text-red-400' : 'text-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill={pathname === '/wishlist' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Wishlist
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