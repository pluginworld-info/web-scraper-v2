'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  price: number;
  originalPrice: number;
  discount: number;
}

export default function ProductCarousel({ products }: { products: Product[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const container = containerRef.current;
      const cardWidth = container.firstElementChild?.getBoundingClientRect().width || 240;
      const gap = 24; 
      const scrollAmount = cardWidth + gap;

      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative group">
      
      {/* --- LEFT BUTTON --- */}
      <button
        onClick={() => scroll('left')}
        // ✅ DYNAMIC: Switched var() to Tailwind primary classes
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 border border-[#333] text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:border-primary -ml-5 shadow-2xl backdrop-blur-sm"
        aria-label="Scroll Left"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* --- SCROLL CONTAINER --- */}
      <div 
        ref={containerRef}
        className="flex gap-6 overflow-x-hidden scroll-smooth pb-4"
      >
        {products.map((p) => (
          <Link
            href={`/product/${p.slug}`}
            key={p.id}
            // ✅ UPDATED: Matches ProductCard background and hover border
            className="min-w-[240px] lg:min-w-[calc(20%-19.2px)] bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 hover:shadow-2xl hover:border-primary/30 transition-all group/card flex-shrink-0"
          >
            {/* Image Container */}
            <div className="relative h-40 w-full bg-[#111] mb-4 rounded-xl overflow-hidden">
              {p.image ? (
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  unoptimized={true}
                  className="object-contain p-4 group-hover/card:scale-110 transition-transform duration-500 drop-shadow-lg"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#555] text-xs italic">
                  No Image
                </div>
              )}

              {/* ✅ DYNAMIC: Discount Badge uses Accent color */}
              {p.discount > 0 && (
                <div className="absolute top-2 right-2 bg-accent text-white text-[10px] font-black px-2 py-1 rounded shadow-lg z-10">
                  {p.discount}% OFF
                </div>
              )}
            </div>

            {/* ✅ DYNAMIC: Hover title turns Primary */}
            <h4 className="font-bold text-white text-sm mb-3 line-clamp-2 h-10 group-hover/card:text-primary transition-colors">
              {p.title}
            </h4>

            <div className="flex items-center gap-3">
              {/* ✅ DYNAMIC: Price uses Accent color */}
              <span className="text-accent font-black text-lg tracking-tighter">
                ${p.price.toFixed(2)}
              </span>
              {p.discount > 0 && (
                <span className="text-[#555] line-through text-xs font-bold">
                  ${p.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* --- RIGHT BUTTON --- */}
      <button
        onClick={() => scroll('right')}
        // ✅ DYNAMIC: Switched var() to Tailwind primary classes
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 border border-[#333] text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:border-primary -mr-5 shadow-2xl backdrop-blur-sm"
        aria-label="Scroll Right"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

    </div>
  );
}