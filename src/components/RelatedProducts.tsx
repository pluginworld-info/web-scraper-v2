import { prisma } from '@/lib/db/prisma';
import ProductCarousel from './ProductCarousel';

export default async function RelatedProducts({ 
  currentId, 
  category, 
  brand 
}: { 
  currentId: string, 
  category: string,
  brand: string // ⚡ ADDED: We now accept the brand!
}) {
  
  // 1. FIRST PRIORITY: Get products from the SAME Category AND SAME Brand
  const sameBrandProducts = await prisma.product.findMany({
    where: {
      category: category,
      brand: brand,
      id: { not: currentId }
    },
    take: 10, 
    include: { listings: true }
  });

  let finalProducts = [...sameBrandProducts];

  // 2. SECOND PRIORITY: If we have less than 10, fill the rest with the same Category
  if (finalProducts.length < 10) {
    const sameCategoryProducts = await prisma.product.findMany({
      where: {
        category: category,
        id: { 
          not: currentId,
          notIn: finalProducts.map(p => p.id) // Don't fetch duplicates
        }
      },
      take: 10 - finalProducts.length,
      include: { listings: true }
    });
    
    finalProducts = [...finalProducts, ...sameCategoryProducts];
  }

  if (finalProducts.length === 0) return null;

  // Process data for the UI
  const processedProducts = finalProducts.map(p => {
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
      {/* --- SECTION HEADER WITH THEME ACCENT --- */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"></div>
        <h3 className="font-black text-sm uppercase tracking-widest text-white">
          Similar <span className="text-primary">Deals</span>
        </h3>
        <div className="h-px bg-gradient-to-r from-[#333] to-transparent flex-grow"></div>
      </div>
      
      <ProductCarousel products={processedProducts} />
    </div>
  );
}