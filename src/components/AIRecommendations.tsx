// FILE: src/components/AIRecommendations.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

interface AIRecommendationsProps {
  initialProducts: any[];
}

export default function AIRecommendations({ initialProducts }: AIRecommendationsProps) {
  // If no products are passed, we don't show the section at all
  if (!initialProducts || initialProducts.length === 0) return null;

  return (
    <section className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-6 md:p-8 text-white shadow-xl overflow-hidden relative border border-white/5">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest">AI Top Picks</h2>
            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest opacity-70">
              Personalized deals based on your interest
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {initialProducts.map((product) => {
            return (
              <Link 
                key={product.id} 
                href={`/product/${product.slug}`}
                className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all duration-300 flex flex-col backdrop-blur-sm"
              >
                <div className="relative h-32 w-full mb-4 rounded-xl overflow-hidden bg-white p-2">
                  {product.image && (
                    <Image 
                      src={product.image} 
                      alt={product.title} 
                      fill 
                      unoptimized
                      className="object-contain group-hover:scale-110 transition duration-500" 
                    />
                  )}
                </div>
                
                <h3 className="font-bold text-xs truncate mb-2 group-hover:text-indigo-300 transition-colors">
                  {product.title}
                </h3>
                
                <div className="mt-auto flex justify-between items-center">
                  <span className="text-white font-black text-sm">
                    ${product.lowestPrice?.toFixed(2) || "0.00"}
                  </span>
                  <span className="text-[9px] font-black uppercase text-indigo-200 bg-white/10 px-2 py-1 rounded-md">
                    {product.brand || 'View Deal'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}