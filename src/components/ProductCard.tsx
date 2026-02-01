import Image from 'next/image';
import Link from 'next/link';
import WishlistToggle from './WishlistToggle';
import AlertModalTrigger from './AlertModalTrigger';

interface ProductCardProps {
  product: any; 
  onClick?: (id: string) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const viewCount = product.views?.length || 0;
  const isHot = viewCount > 50; 
  
  const lowestPrice = product.lowestPrice || product.minPrice || 0;
  const originalPrice = product.maxRegularPrice || product.originalPrice || lowestPrice;
  const discount = product.maxDiscount || (originalPrice > lowestPrice ? Math.round(((originalPrice - lowestPrice) / originalPrice) * 100) : 0);

  return (
    <div className="group relative bg-card-dark rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-800 flex flex-col h-full">
      
      {/* IMAGE AREA */}
      <div className="relative aspect-square w-full overflow-hidden bg-white p-4">
        
        {/* --- BADGES --- */}
        <div className="absolute top-12 left-3 flex flex-col gap-2 z-10 pointer-events-none">
           {isHot && (
            <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 shadow-md w-fit animate-pulse">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
               Hot
            </span>
           )}
           
           {discount > 70 && (
             <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase px-2 py-1 rounded-full shadow-md w-fit">
               Lowest Price
             </span>
           )}
        </div>

        <WishlistToggle productId={product.id} />

        {discount > 0 && (
          <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg z-10 pointer-events-none">
            {discount}% OFF
          </div>
        )}

        <Link 
          href={`/product/${product.slug}`}
          onClick={() => onClick && onClick(product.id)}
          className="block w-full h-full relative"
        >
          {product.image ? (
            <Image 
              src={product.image} 
              alt={product.title} 
              fill 
              unoptimized={true}
              className="object-contain p-4 group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300 font-medium italic">No Image</div>
          )}
        </Link>
      </div>

      {/* CONTENT AREA */}
      <div className="p-5 flex-grow flex flex-col items-center text-center">
        <span className="text-[10px] font-black uppercase text-blue-500 tracking-tighter mb-1">
          {product.brand || 'Brand'}
        </span>

        <Link 
           href={`/product/${product.slug}`}
           onClick={() => onClick && onClick(product.id)}
        >
          <h3 className="text-white font-bold text-sm mb-2 line-clamp-2 h-10 leading-tight group-hover:text-blue-400 transition-colors cursor-pointer">
            {product.title}
          </h3>
        </Link>

        {/* STAR RATING */}
        <div className="flex items-center gap-1 mb-4">
          <div className="flex text-yellow-400">
             {[...Array(5)].map((_, i) => (
               <svg key={i} className={`w-3 h-3 ${i < Math.floor(parseFloat(product.avgRating || "0")) ? 'fill-current' : 'text-gray-700 fill-current'}`} viewBox="0 0 20 20">
                 <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
               </svg>
             ))}
          </div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
            ({product.reviews?.length || product.reviewCount || 0})
          </span>
        </div>

        {/* PRICING */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            {discount > 0 && (
              <span className="text-gray-500 line-through text-xs font-bold">
                ${originalPrice.toFixed(2)}
              </span>
            )}
            <span className="text-red-500 font-black text-xl tracking-tighter">
              ${lowestPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-3 w-full mt-auto">
           <Link 
             href={`/product/${product.slug}`}
             onClick={() => onClick && onClick(product.id)}
             className="bg-gray-400/10 hover:bg-gray-400/20 text-white text-[10px] font-black py-2.5 rounded-full transition-colors flex items-center justify-center tracking-widest uppercase"
           >
             View
           </Link>
           <AlertModalTrigger product={product} isSmall />
        </div>
      </div>
    </div>
  );
}