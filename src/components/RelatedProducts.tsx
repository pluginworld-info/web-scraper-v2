import { prisma } from '@/lib/db/prisma';
import ProductCarousel from './ProductCarousel';

export default async function RelatedProducts({ currentId, category }: { currentId: string, category: string }) {
  
  // ✅ REQ: Fetch 10 items for the carousel
  const related = await prisma.product.findMany({
    where: {
      category: category,
      id: { not: currentId }
    },
    take: 10, // Increased to 10
    include: { listings: true }
  });

  if (related.length === 0) return null;

  // Process data here to keep the Client Component clean
  const processedProducts = related.map(p => {
    const bestListing = p.listings.sort((a, b) => a.price - b.price)[0];
    const price = bestListing?.price || 0;
    const originalPrice = bestListing?.originalPrice || price;
    const discount = originalPrice > price 
        ? Math.round(((originalPrice - price) / originalPrice) * 100) 
        : 0;

    return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        image: p.image,
        price,
        originalPrice,
        discount
    };
  });

  return (
    <div className="mt-16">      
      <div className="flex items-center gap-4 mb-8">
        <h3 className="font-black text-sm uppercase tracking-widest text-[#aaaaaa]">Similar Deals</h3>
        <div className="h-px bg-[#333] flex-grow"></div>
      </div>
      
      {/* Pass processed data to the Client Carousel */}
      <ProductCarousel products={processedProducts} />
    </div>
  );
}