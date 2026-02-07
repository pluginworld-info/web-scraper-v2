import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendPriceAlertEmail } from '@/lib/mailer'; 

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Security Check
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  
  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("⏰ Cron Job Started: Sweeping for Missed Alerts...");

    // 2. Find ALL active, untriggered alerts
    // We fetch the product listings to compare prices freshly
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { isTriggered: false },
      include: { 
        product: {
            select: { title: true, minPrice: true, slug: true, listings: true }
        } 
      }
    });

    let sentCount = 0;

    // 3. Loop and Check Conditions
    for (const alert of activeAlerts) {
      // Calculate true lowest price from listings (Safety Check)
      let currentPrice = alert.product.minPrice;
      
      if (alert.product.listings && alert.product.listings.length > 0) {
          const prices = alert.product.listings.map(l => l.price).filter(p => p > 0);
          if (prices.length > 0) currentPrice = Math.min(...prices);
      }

      // If price condition is met
      if (currentPrice > 0 && currentPrice <= alert.targetPrice) {
        
        // Find best URL
        const bestListing = alert.product.listings.sort((a, b) => a.price - b.price)[0];
        const url = bestListing ? bestListing.url : `https://yourdomain.com/product/${alert.product.slug}`;

        try {
            await sendPriceAlertEmail(
                alert.email,
                alert.product.title,
                currentPrice,
                alert.targetPrice,
                url
            );

            // Mark as Sent
            await prisma.priceAlert.update({
                where: { id: alert.id },
                data: { isTriggered: true, triggeredAt: new Date() }
            });

            console.log(`✅ Alert Sent to ${alert.email}`);
            sentCount++;
        } catch (error) {
            console.error(`❌ Failed to send to ${alert.email}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      checked: activeAlerts.length, 
      sent: sentCount 
    });

  } catch (error: any) {
    console.error("Cron Error:", error.message);
    return NextResponse.json({ error: "Alert Cron Failed" }, { status: 500 });
  }
}