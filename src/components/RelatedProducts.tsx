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
    <div className="mt-12">
      <h3 className="text-xl font-bold mb-4">Related Deals</h3>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {related.map(p => {
            const price = p.listings[0]?.price || 0;
            return (
                <Link href={`/product/${p.slug}`} key={p.id} className="min-w-[200px] bg-white border rounded-lg p-3 hover:shadow-md transition">
                    <div className="relative h-32 w-full bg-gray-100 mb-2 rounded">
                        {p.image && <Image src={p.image} alt={p.title} fill className="object-cover rounded" />}
                    </div>
                    <h4 className="font-semibold text-sm truncate">{p.title}</h4>
                    <p className="text-green-600 font-bold">${price}</p>
                </Link>
            )
        })}
      </div>
    </div>
  );
}