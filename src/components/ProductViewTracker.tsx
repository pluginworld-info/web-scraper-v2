'use client';

import { useEffect } from 'react';

export default function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    if (!productId) return;

    // Fire and forget - track the view
    fetch('/api/products/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    }).catch(err => console.error("View track error", err));
  }, [productId]);

  return null; // This component is invisible
}