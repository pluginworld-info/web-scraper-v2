import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch all clicks from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clicks = await prisma.productClick.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        product: { select: { title: true } }
      }
    });

    // 2. Aggregate Daily Clicks (Graph Data)
    const clicksByDate: Record<string, number> = {};
    clicks.forEach(click => {
      const date = click.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      clicksByDate[date] = (clicksByDate[date] || 0) + 1;
    });

    // Transform into array for Recharts
    const graphData = Object.entries(clicksByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Aggregate Top Products (Table Data)
    const productStats: Record<string, number> = {};
    clicks.forEach(click => {
      productStats[click.product.title] = (productStats[click.product.title] || 0) + 1;
    });

    const topProducts = Object.entries(productStats)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    return NextResponse.json({ graphData, topProducts });

  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}