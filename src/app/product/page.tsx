import { prisma } from '@/lib/db/prisma';
import Image from 'next/image';
import PriceChart from '@/components/PriceChart';
import RelatedProducts from '@/components/RelatedProducts';
import AlertModalTrigger from '@/components/AlertModalTrigger'; // We will build this next with your files

export default async function ProductPage({ params }: { params: { slug: string } }) {
  
  // 1. Fetch Product Data
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      listings: {
        include: { 
            retailer: true,
            history: { orderBy: { date: 'asc' } } // Fetch history for chart
        },
        orderBy: { price: 'asc' } // Show cheapest first
      },
      reviews: true
    }
  });

  if (!product) return <div className="p-10 text-center">Product not found</div>;

  // Combine histories from all listings for the "Global Chart"
  const globalHistory = product.listings.flatMap(l => l.history).sort((a,b) => a.date.getTime() - b.date.getTime());

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 bg-white min-h-screen">
      
      {/* Top Section: Image & Info */}
      <div className="grid md:grid-cols-3 gap-8 mb-10">
        
        {/* Left: Image */}
        <div className="md:col-span-1">
          <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border">
            {product.image && (
               <Image src={product.image} alt={product.title} fill className="object-cover" />
            )}
          </div>
        </div>

        {/* Right: Details & Comparison */}
        <div className="md:col-span-2">
          <div className="flex justify-between items-start mb-4">
             <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                <p className="text-gray-500 text-sm">Brand: {product.brand} | Category: {product.category}</p>
             </div>
             {/* Req #4: Alert Button (Placeholder for now) */}
             <AlertModalTrigger product={product} /> 
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed">
            {product.description?.substring(0, 300)}...
          </p>

          {/* Req #3: Price Comparison List */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-4">Compare Prices</h3>
            <div className="space-y-3">
                {product.listings.map((listing, index) => (
                    <div key={listing.id} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
                        <div className="flex items-center gap-3">
                            {/* If we have a logo, show it, otherwise show text */}
                            {listing.retailer.logo ? (
                                <img src={listing.retailer.logo} alt={listing.retailer.name} className="h-8 w-auto object-contain" />
                            ) : (
                                <span className="font-bold text-gray-700">{listing.retailer.name}</span>
                            )}
                            {index === 0 && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">BEST PRICE</span>}
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-gray-900">${listing.price}</span>
                            <a 
                                href={listing.url} 
                                target="_blank" 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
                            >
                                Buy Now ↗
                            </a>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Req #5: Price History Chart */}
      <div className="mb-12">
        <h3 className="text-xl font-bold mb-4">Price History</h3>
        <PriceChart history={globalHistory} />
      </div>

      {/* Req #7: Related Products */}
      <RelatedProducts currentId={product.id} category={product.category || ''} />

    </main>
  );
}