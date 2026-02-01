'use client';

import { useState, useEffect } from 'react';

export default function WishlistToggle({ productId }: { productId: string }) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  // 1. Check status on load
  useEffect(() => {
    const saved = localStorage.getItem('wishlist_items');
    if (saved) {
      const ids = JSON.parse(saved);
      if (ids.includes(productId)) setIsWishlisted(true);
    }
  }, [productId]);

  // 2. Toggle Logic
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const saved = localStorage.getItem('wishlist_items');
    let ids: string[] = saved ? JSON.parse(saved) : [];

    if (isWishlisted) {
      // Remove
      ids = ids.filter(id => id !== productId);
      setIsWishlisted(false);
    } else {
      // Add
      if (!ids.includes(productId)) ids.push(productId);
      setIsWishlisted(true);
    }

    localStorage.setItem('wishlist_items', JSON.stringify(ids));
  };

  return (
    <button
      onClick={toggle}
      className={`absolute top-3 left-3 z-20 p-2 rounded-full shadow-sm backdrop-blur-sm transition-all transform hover:scale-110 group ${
          isWishlisted ? "bg-red-50" : "bg-gray-100/80 hover:bg-white"
      }`}
      title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isWishlisted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        className={`w-4 h-4 transition-colors ${
          isWishlisted ? "text-red-500" : "text-gray-400 group-hover:text-red-500"
        }`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    </button>
  );
}