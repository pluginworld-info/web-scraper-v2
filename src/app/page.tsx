export const dynamic = 'force-dynamic';
import AIRecommendations from '@/components/AIRecommendations';
import { prisma } from '@/lib/db/prisma';
import ProductGrid from '@/components/ProductGrid';

export const revalidate = 60; // Refresh data every minute

export default async function HomePage() {
  // 1. Fetch Products with all listings to find best price
  const products = await prisma.product.findMany({
    include: {
      listings: true,
      reviews: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  // 2. Process Data (Calculate Lowest Price & Rating)
  const processedProducts = products.map(p => {
    // Find lowest active price
    const prices = p.listings.map(l => l.price).filter(p => p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    
    // Calculate Avg Rating
    const totalRating = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = p.reviews.length > 0 ? (totalRating / p.reviews.length).toFixed(1) : "N/A";

    return { ...p, lowestPrice, avgRating };
  });

  return (
    <main className="p-4 bg-gray-50 min-h-screen">
      
      {/* Requirement #1: Search & Sort Header */}
      <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Plugin Deals Tracker</h1>
        {/* We will build the client-side search bar in the ProductGrid component */}
      </div>

      {/* Requirement #6: AI Recommendations */}
      <div className="mb-8">
         <AIRecommendations /> 
      </div>

      {/* Requirement #1 & #2: Product Grid */}
      <ProductGrid initialProducts={processedProducts} />
      
    </main>
  );
}