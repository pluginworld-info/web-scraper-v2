import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// 1. GET: Fetch Stats + List
export async function GET() {
  try {
    const totalAlerts = await prisma.priceAlert.count();
    const triggeredAlerts = await prisma.priceAlert.count({ where: { isTriggered: true } });
    const activeAlerts = totalAlerts - triggeredAlerts;

    const topProductsRaw = await prisma.priceAlert.groupBy({
      by: ['productId'],
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 4,
    });

    const topProducts = await Promise.all(topProductsRaw.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { title: true, minPrice: true, image: true, slug: true }
      });
      return { ...product, count: item._count.productId };
    }));

    const alerts = await prisma.priceAlert.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { title: true, minPrice: true, slug: true, image: true }
        }
      }
    });

    return NextResponse.json({
      stats: { total: totalAlerts, active: activeAlerts, triggered: triggeredAlerts },
      topProducts,
      alerts
    });

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

// 2. DELETE: Remove an Alert
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: "ID Required" }, { status: 400 });

  try {
    await prisma.priceAlert.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}