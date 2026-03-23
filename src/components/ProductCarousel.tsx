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
      
      {/* --- LEFT BUTTON (Hidden on mobile) --- */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 border border-[#333] text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:border-primary -ml-5 shadow-2xl backdrop-blur-sm"
        aria-label="Scroll Left"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* --- SCROLL CONTAINER --- */}
      <div 
        ref={containerRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 items-stretch [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {products.map((p) => (
          <Link
            href={`/product/${p.slug}`}
            key={p.id}
            // ⚡ FIXED: min-w-full makes it 1 item per view on mobile, md:min-w-[240px] brings it back to a grid on tablet+
            className="min-w-full md:min-w-[240px] lg:min-w-[calc(20%-19.2px)] snap-start bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 hover:shadow-2xl hover:border-primary/30 transition-all group/card flex-shrink-0 flex flex-col"
          >
            {/* Image Container */}
            <div className="relative h-40 w-full bg-[#111] mb-4 rounded-xl overflow-hidden shrink-0">
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

              {p.discount > 0 && (
                <div className="absolute top-2 right-2 bg-accent text-white text-[10px] font-black px-2 py-1 rounded shadow-lg z-10">
                  {p.discount}% OFF
                </div>
              )}
            </div>

            {/* TITLE */}
            <h4 
               className="font-bold text-white text-sm mb-3 line-clamp-2 min-h-[40px] group-hover/card:text-primary transition-colors"
               title={p.title}
            >
              {p.title}
            </h4>

            {/* PRICE */}
            <div className="flex items-center gap-3 mt-auto">
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

      {/* --- RIGHT BUTTON (Hidden on mobile) --- */}
      <button
        onClick={() => scroll('right')}
        className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 border border-[#333] text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:border-primary -mr-5 shadow-2xl backdrop-blur-sm"
        aria-label="Scroll Right"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

    </div>
  );
}