'use client';

import { useState, useEffect } from 'react';

export default function WishlistToggle({ productId }: { productId: string }) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wishlist_items');
    if (saved) {
      const ids = JSON.parse(saved);
      if (ids.includes(productId)) setIsWishlisted(true);
    }
  }, [productId]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    const saved = localStorage.getItem('wishlist_items');
    let ids: string[] = saved ? JSON.parse(saved) : [];

    if (isWishlisted) {
      ids = ids.filter(id => id !== productId);
      setIsWishlisted(false);
    } else {
      if (!ids.includes(productId)) ids.push(productId);
      setIsWishlisted(true);
    }

    localStorage.setItem('wishlist_items', JSON.stringify(ids));
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  return (
    <button
      onClick={toggle}
      // ✅ DYNAMIC: Switched to Accent color and Dark Mode backgrounds
      className={`absolute bottom-3 right-3 z-20 p-2 rounded-full shadow-lg backdrop-blur-md transition-all transform hover:scale-125 group border ${
          isWishlisted 
            ? "bg-accent/10 border-accent/20" 
            : "bg-black/40 border-white/5 hover:bg-black/60"
      }`}
      title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isWishlisted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.5"
        // ✅ DYNAMIC: Heart color now follows the Accent variable
        className={`w-4 h-4 transition-colors ${
          isWishlisted ? "text-accent" : "text-gray-500 group-hover:text-accent"
        }`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    </button>
  );
}