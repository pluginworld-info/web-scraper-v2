import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch Counts (Parallel for speed)
    const [products, alerts, clicks, reviews] = await Promise.all([
      prisma.product.count(),
      prisma.priceAlert.count({ where: { isTriggered: false } }),
      prisma.productClick.count(),
      prisma.review.count()
    ]);

    // 2. Fetch Recent Activity (Alerts)
    const recentAlerts = await prisma.priceAlert.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { title: true }
        }
      }
    });

    return NextResponse.json({
      products,
      alerts,
      clicks,
      reviews,
      recentAlerts
    });

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json({ error: "Stats failed" }, { status: 500 });
  }
}