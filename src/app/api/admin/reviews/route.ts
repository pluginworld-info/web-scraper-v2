import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch Review Counts per Product (For the Sidebar)
    const grouped = await prisma.review.groupBy({
      by: ['productId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // 2. Fetch Product Details for those groups
    const productStats = await Promise.all(
      grouped.map(async (g) => {
        const product = await prisma.product.findUnique({
          where: { id: g.productId },
          select: { id: true, title: true, image: true }
        });
        return { ...product, count: g._count.id };
      })
    );

    // 3. Fetch All Actual Reviews (For the Main Table)
    // We fetch them all sorted by date so the UI can filter them locally without spamming the API
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { title: true, image: true } }
      }
    });

    return NextResponse.json({ 
      products: productStats, 
      reviews: reviews 
    });

  } catch (error) {
    console.error("Reviews API Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: "ID Required" }, { status: 400 });

  try {
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}