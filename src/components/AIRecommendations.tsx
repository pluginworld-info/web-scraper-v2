import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import Image from 'next/image';

export default async function AIRecommendations() {
  // "Cold Start" Strategy: 
  // Since we don't have user history yet, we show "Trending" (newest updated products).
  // Later, we will swap this query with a personalized vector search.
  const recommendations = await prisma.product.findMany({
    take: 4,
    include: { listings: true },
    orderBy: { 
      // In a real app, you might sort by view count or 'UserEvent' logs
      updatedAt: 'desc' 
    }
  });

  if (recommendations.length === 0) return null;

  return (
    <section className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-6 md:p-8 text-white shadow-xl overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">✨</span>
          <div>
            <h2 className="text-xl font-bold">AI Picks for You</h2>
            <p className="text-indigo-200 text-sm">Based on trending deals this week</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendations.map((product) => {
            // Find lowest price
            const prices = product.listings.map(l => l.price).filter(p => p > 0);
            const price = prices.length > 0 ? Math.min(...prices) : 0;

            return (
              <Link 
                key={product.id} 
                href={`/product/${product.slug}`}
                className="group bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl p-3 transition flex flex-col backdrop-blur-sm"
              >
                <div className="relative h-32 w-full mb-3 rounded-lg overflow-hidden bg-black/20">
                  {product.image && (
                    <Image 
                      src={product.image} 
                      alt={product.title} 
                      fill 
                      className="object-cover group-hover:scale-105 transition duration-500" 
                    />
                  )}
                </div>
                
                <h3 className="font-semibold text-sm truncate mb-1">{product.title}</h3>
                
                <div className="mt-auto flex justify-between items-center">
                  <span className="text-green-300 font-bold">${price}</span>
                  <span className="text-xs text-indigo-200 bg-indigo-500/30 px-2 py-1 rounded">
                    {product.listings.length} deals
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