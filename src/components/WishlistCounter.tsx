'use client';

import { useState, useEffect } from 'react';

export default function WishlistCounter() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 1. Initial Check
    const checkCount = () => {
      try {
        const saved = localStorage.getItem('wishlist_items');
        if (saved) {
          const ids = JSON.parse(saved);
          if (Array.isArray(ids)) {
             // Filter out any "ghost" nulls/empty strings
             const validCount = ids.filter(id => typeof id === 'string' && id.trim().length > 0).length;
             setCount(validCount);
             return;
          }
        }
        setCount(0);
      } catch (e) {
        setCount(0);
      }
    };

    checkCount();

    // 2. Listen for Updates (The magic fix)
    window.addEventListener('wishlist-updated', checkCount);
    return () => window.removeEventListener('wishlist-updated', checkCount);
  }, []);

  if (!mounted || count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-md animate-in fade-in zoom-in duration-300">
      {count}
    </span>
  );
}