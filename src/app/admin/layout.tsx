'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // ✅ STATE: Default to false (locked) until checked
  const [isAuthorized, setIsAuthorized] = useState(false);

  // ✅ LOGIC: Robust check function
  const checkAuth = () => {
    // Safety check for window to avoid SSR errors
    if (typeof window !== 'undefined') {
      const authStatus = sessionStorage.getItem('admin_authenticated');
      // If we are on the login page specifically, we might want to keep it locked
      // But generally, we trust the session storage.
      setIsAuthorized(authStatus === 'true');
    }
  };

  useEffect(() => {
    // 1. Check immediately on mount
    checkAuth();

    // 2. Listen for custom event from Login Page (Instant Unlock)
    const handleAuthChange = () => checkAuth();
    window.addEventListener('admin-auth-change', handleAuthChange);
    
    // 3. Re-check on storage changes (Multi-tab support)
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('admin-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [pathname]); // Also re-check when URL changes

  // NAVIGATION ITEMS
  const navItems = [
    { name: 'Overview', href: '/admin', icon: <HomeIcon /> },
    { name: 'Analytics', href: '/admin/analytics', icon: <ChartBarIcon /> }, 
    { name: 'Data Feeds', href: '/admin/feeds', icon: <CloudArrowDownIcon /> },
    { name: 'Price Alerts', href: '/admin/alerts', icon: <BellIcon /> },
    { name: 'Email Template', href: '/admin/email-template', icon: <EnvelopeIcon /> }, // ✅ NEW
    { name: 'Reviews', href: '/admin/reviews', icon: <ChatIcon /> },
    { name: 'Site Settings', href: '/admin/settings', icon: <CogIcon /> }, 
  ];

  return (
    <div className="min-h-screen bg-[#111] text-white flex font-sans">
      
      {/* --- SIDEBAR (DESKTOP) --- */}
      <aside 
        className={`hidden md:flex flex-col w-64 border-r border-[#333] bg-[#1a1a1a] fixed h-full z-20 transition-all duration-500 ${
          !isAuthorized 
            ? 'blur-sm grayscale opacity-50 pointer-events-none select-none' 
            : 'blur-0 grayscale-0 opacity-100'
        }`}
      >
        
        {/* Logo Area */}
        <div className="p-6 border-b border-[#333] flex items-center gap-2">
           <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-xl text-white shadow-lg shadow-primary/40">P</div>
           <span className="font-bold text-lg tracking-tight">Admin<span className="text-primary">Panel</span></span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-[#888] hover:bg-[#222] hover:text-white'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-[#333]">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#222] rounded-xl border border-[#333]">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-primary flex-shrink-0"></div>
             <div className="flex flex-col overflow-hidden">
               <span className="text-sm font-bold text-white truncate">Administrator</span>
               <span className="text-[10px] text-[#666] uppercase">Super User</span>
             </div>
          </div>
        </div>
      </aside>

      {/* --- MOBILE HEADER --- */}
      <div 
        className={`md:hidden fixed top-0 left-0 right-0 h-16 bg-[#1a1a1a] border-b border-[#333] z-30 flex items-center justify-between px-4 shadow-lg transition-all ${
           !isAuthorized ? 'blur-sm pointer-events-none opacity-50' : ''
        }`}
      >
          <span className="font-bold text-lg">AdminPanel</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[#888] hover:text-white">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
      </div>

      {/* --- MOBILE MENU --- */}
      {isMobileMenuOpen && isAuthorized && (
         <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-sm md:hidden pt-20 px-6 animate-in slide-in-from-top-10 duration-200">
            <nav className="space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 text-lg font-bold py-4 border-b border-[#333] ${
                      pathname === item.href ? 'text-primary' : 'text-[#aaa] hover:text-white'
                  }`}
                >
                   {item.icon}
                   {item.name}
                </Link>
              ))}
            </nav>
            <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="mt-8 w-full py-4 text-sm text-white font-bold uppercase border border-white/20 rounded-xl hover:bg-white/10"
            >
                Close Menu
            </button>
         </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-24 md:pt-8 bg-[#111] min-h-screen relative">
        {children}
      </main>
    </div>
  );
}

// --- ICONS ---
function HomeIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function ChartBarIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>; }
function CloudArrowDownIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8" /></svg>; }
function BellIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>; }
function ChatIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>; }
function CogIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function EnvelopeIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>; }