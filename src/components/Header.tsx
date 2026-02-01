'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Brands', href: '/brands' },
    { name: 'Categories', href: '/categories' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#555555] text-white shadow-md">
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
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-blue-300 ${
                    isActive ? 'text-blue-400' : 'text-gray-200'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* MOBILE MENU ICON (Placeholder) */}
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