import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Setup Date Range (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 2. Fetch Clicks (ProductClick)
    // We include the Product title, but we can't include Retailer directly yet
    const clicks = await prisma.productClick.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        product: { select: { title: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // 3. Manual Retailer Lookup
    // Since there is no relation in the schema, we collect IDs and fetch names manually
    const retailerIds = Array.from(new Set(clicks.map(c => c.retailerId).filter(Boolean))) as string[];
    
    const retailers = await prisma.retailer.findMany({
        where: { id: { in: retailerIds } },
        select: { id: true, name: true }
    });

    // Create a Lookup Map: ID -> Name
    const retailerMap: Record<string, string> = {};
    retailers.forEach(r => {
        retailerMap[r.id] = r.name;
    });

    // 4. Aggregate Daily Clicks by Retailer (For Stacked Bar Graph)
    const graphMap = new Map<string, any>();
    const allRetailers = new Set<string>();

    clicks.forEach(click => {
      const dateKey = click.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      // Resolve Name from Map, or fallback to "Unknown"
      const retailerName = click.retailerId ? (retailerMap[click.retailerId] || 'Unknown') : 'Direct';
      
      allRetailers.add(retailerName);

      if (!graphMap.has(dateKey)) {
        graphMap.set(dateKey, { date: dateKey });
      }

      const entry = graphMap.get(dateKey);
      entry[retailerName] = (entry[retailerName] || 0) + 1;
    });

    const graphData = Array.from(graphMap.values());

    // 5. Aggregate Top Products (For Table)
    const productMap = new Map<string, any>();

    clicks.forEach(click => {
      const title = click.product.title;
      const retailerName = click.retailerId ? (retailerMap[click.retailerId] || 'Unknown') : 'Direct';

      if (!productMap.has(title)) {
        productMap.set(title, { 
            title, 
            totalClicks: 0, 
            breakdown: {} 
        });
      }

      const entry = productMap.get(title);
      entry.totalClicks += 1;
      entry.breakdown[retailerName] = (entry.breakdown[retailerName] || 0) + 1;
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, 10);

    return NextResponse.json({ 
      graphData, 
      retailers: Array.from(allRetailers), 
      topProducts 
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}