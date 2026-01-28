// FILE: src/app/product/[slug]/page.tsx

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db/prisma';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import PriceChart from '@/components/PriceChart'; 
import AlertModalTrigger from '@/components/AlertModalTrigger';

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  // 1. Get the slug from the URL
  const { slug } = params;

  // 2. Find the product in the database
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      listings: {
        include: {
          retailer: true,
          history: {
            orderBy: { date: 'asc' } // Needed for the chart
          }
        },
        orderBy: { price: 'asc' } // Show cheapest price first
      }
    }
  });

  // 3. If no product found, show 404 page
  if (!product) return notFound();

  // 4. Calculate best price
  const bestPrice = product.listings[0]?.price || 0;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      
      {/* --- HEADER SECTION --- */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Product Image */}
        <div className="relative h-96 w-full bg-white rounded-2xl shadow-lg overflow-hidden p-4">
          {product.image ? (
            <Image 
              src={product.image} 
              alt={product.title} 
              fill 
              className="object-contain"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300">No Image</div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-center">
          <span className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-2">{product.brand || 'Plugin'}</span>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{product.title}</h1>
          <p className="text-gray-600 text-lg mb-6 leading-relaxed">
            {product.description?.substring(0, 300)}...
          </p>

          <div className="flex items-center gap-4 mb-8">
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold text-2xl">
              ${bestPrice}
            </div>
            {product.listings.length > 1 && (
              <span className="text-gray-500 text-sm">Compared across {product.listings.length} stores</span>
            )}
          </div>

          <div className="flex gap-3">
             {/* The "Set Alert" Button */}
             <AlertModalTrigger product={product} />
          </div>
        </div>
      </div>

      {/* --- PRICE COMPARISON TABLE --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="font-bold text-lg">🛍️ Store Comparison</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {product.listings.map((listing) => (
            <div key={listing.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">{listing.retailer.name}</span>
                {listing.price === bestPrice && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">Best Deal</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg">${listing.price}</span>
                <a 
                  href={listing.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                >
                  View Deal →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- PRICE HISTORY CHART --- */}
      <div className="mb-12">
        <h3 className="font-bold text-xl mb-4">📉 Price History</h3>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-80">
          {/* We grab history from the first listing (usually the main one) */}
          <PriceChart history={product.listings[0]?.history || []} />
        </div>
      </div>

    </div>
  );
}