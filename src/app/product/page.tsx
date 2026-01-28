// FILE: src/app/product/page.tsx

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db/prisma';
import ProductGrid from '@/components/ProductGrid';

export default async function AllProductsPage() {
  // 1. Fetch products (Limit to 12 for speed)
  const products = await prisma.product.findMany({
    take: 12,
    include: {
      listings: true,
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  // 2. Process Data (Calculate Lowest Price & Rating)
  const processedProducts = products.map(p => {
    const prices = p.listings.map(l => l.price).filter(p => p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    
    const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "N/A";

    return { ...p, lowestPrice, avgRating };
  });

  return (
    <main className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">All Plugins</h1>
        
        {/* Reuse the Grid Component */}
        <ProductGrid initialProducts={processedProducts} />
      </div>
    </main>
  );
}