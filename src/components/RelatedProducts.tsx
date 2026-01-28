import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import Image from 'next/image';

export default async function RelatedProducts({ currentId, category }: { currentId: string, category: string }) {
  // Req #7: Find products in same category, excluding current one
  const related = await prisma.product.findMany({
    where: {
      category: category,
      id: { not: currentId }
    },
    take: 6,
    include: { listings: true } // Need listings to show price
  });

  if (related.length === 0) return null;

  return (
    <div className="mt-16">
      <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        <span className="bg-blue-600 w-2 h-8 rounded-full inline-block"></span>
        Related Deals
      </h3>
      
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
        {related.map(p => {
            // Find the best listing for pricing logic
            const bestListing = p.listings.sort((a, b) => a.price - b.price)[0];
            const price = bestListing?.price || 0;
            const originalPrice = bestListing?.originalPrice || price;
            
            // Calculate percentage off
            const discount = originalPrice > price 
                ? Math.round(((originalPrice - price) / originalPrice) * 100) 
                : 0;

            return (
                <Link 
                    href={`/product/${p.slug}`} 
                    key={p.id} 
                    className="snap-start min-w-[240px] bg-[#1e1e1e] border border-gray-800 rounded-2xl p-4 hover:shadow-2xl hover:border-gray-700 transition-all group"
                >
                    {/* Image Container */}
                    <div className="relative h-40 w-full bg-gray-900 mb-4 rounded-xl overflow-hidden">
                        {p.image ? (
                            <Image 
                                src={p.image} 
                                alt={p.title} 
                                fill 
                                className="object-cover group-hover:scale-110 transition-transform duration-500" 
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-700 text-xs">No Image</div>
                        )}

                        {/* Red Discount Badge */}
                        {discount > 0 && (
                            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-md">
                                {discount}% OFF
                            </div>
                        )}
                    </div>

                    {/* Text Details */}
                    <h4 className="font-bold text-white text-sm mb-3 line-clamp-2 h-10 group-hover:text-blue-400 transition-colors">
                        {p.title}
                    </h4>

                    <div className="flex items-center gap-3">
                        <span className="text-red-500 font-black text-lg">${price.toFixed(2)}</span>
                        {discount > 0 && (
                            <span className="text-gray-500 line-through text-xs">${originalPrice.toFixed(2)}</span>
                        )}
                    </div>
                </Link>
            )
        })}
      </div>
    </div>
  );
}