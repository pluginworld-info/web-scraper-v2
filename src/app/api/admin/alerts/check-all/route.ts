import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendPriceAlertEmail } from '@/lib/mailer'; // Make sure path is correct!

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // 1. Find ALL active, untriggered alerts
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { isTriggered: false },
      include: { 
        product: {
            // We need the product's current cached price
            select: { title: true, minPrice: true, slug: true, listings: true }
        } 
      }
    });

    let sentCount = 0;

    // 2. Loop through and check if the condition is ALREADY met
    for (const alert of activeAlerts) {
      const currentPrice = alert.product.minPrice; // Uses the cached minPrice on Product

      // If the current price is LOWER or EQUAL to target
      if (currentPrice > 0 && currentPrice <= alert.targetPrice) {
        
        // Find a valid URL to send them to (pick the cheapest listing)
        // Sort listings by price to find the best one
        const bestListing = alert.product.listings.sort((a, b) => a.price - b.price)[0];
        const url = bestListing ? bestListing.url : `https://yourdomain.com/product/${alert.product.slug}`;

        // 3. Send the Email
        try {
            await sendPriceAlertEmail(
                alert.email,
                alert.product.title,
                currentPrice,
                alert.targetPrice,
                url
            );

            // 4. Mark as Triggered
            await prisma.priceAlert.update({
                where: { id: alert.id },
                data: { isTriggered: true, triggeredAt: new Date() }
            });

            console.log(`✅ Backfill Alert sent to ${alert.email}`);
            sentCount++;
        } catch (error) {
            console.error(`❌ Failed to send backfill to ${alert.email}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Checked ${activeAlerts.length} alerts. Sent ${sentCount} notifications.` 
    });

  } catch (error) {
    console.error("Backfill Error:", error);
    return NextResponse.json({ error: "Failed to run check" }, { status: 500 });
  }
}