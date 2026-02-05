'use client';

import { useState, useEffect } from 'react';

export default function WishlistCounter() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkCount = () => {
      try {
        const saved = localStorage.getItem('wishlist_items');
        if (saved) {
          const ids = JSON.parse(saved);
          if (Array.isArray(ids)) {
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

    window.addEventListener('wishlist-updated', checkCount);
    window.addEventListener('storage', checkCount); // Handle multi-tab updates
    return () => {
      window.removeEventListener('wishlist-updated', checkCount);
      window.removeEventListener('storage', checkCount);
    };
  }, []);

  if (!mounted || count === 0) return null;

  return (
    // ✅ DYNAMIC: Switched bg-blue-600 to bg-accent
    <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)] animate-in fade-in zoom-in duration-300">
      {count}
    </span>
  );
}