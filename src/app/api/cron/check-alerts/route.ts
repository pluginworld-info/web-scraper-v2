import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendPriceAlertEmail } from '@/lib/mailer';

// Prevent caching so we always get fresh data
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Security Check
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  
  // Reuse the same secret you set up for the Sync job
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("🔍 Cron Job: Checking Price Alerts...");

    // 2. Fetch Active Alerts (Only those NOT triggered yet)
    // We include the 'product' so we know its current 'minPrice'
    const alerts = await prisma.priceAlert.findMany({
      where: { isTriggered: false },
      include: { product: true }
    });

    if (alerts.length === 0) {
      console.log("   No active alerts to check.");
      return NextResponse.json({ message: "No active alerts pending." });
    }

    let triggeredCount = 0;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pluginworld.com'; // Adjust fallback as needed

    // 3. Loop through alerts and check conditions
    for (const alert of alerts) {
      const currentPrice = alert.product.minPrice;
      const targetPrice = alert.targetPrice;

      // 4. CHECK: Is the deal live?
      if (currentPrice > 0 && currentPrice <= targetPrice) {
        console.log(`   🚀 Triggering Alert for ${alert.email} on ${alert.product.title}`);

        try {
          // A. Send Email
          const productUrl = `${baseUrl}/product/${alert.product.slug}`;
          await sendPriceAlertEmail(
            alert.email,
            alert.product.title,
            currentPrice,
            targetPrice,
            productUrl
          );

          // B. Update Database (Mark as triggered so we don't spam them)
          await prisma.priceAlert.update({
            where: { id: alert.id },
            data: { 
              isTriggered: true,
              triggeredAt: new Date()
            }
          });

          triggeredCount++;

        } catch (error) {
          console.error(`   ❌ Failed to email ${alert.email}:`, error);
        }
      }
    }

    console.log(`✅ Finished. Triggered ${triggeredCount} alerts.`);
    return NextResponse.json({ success: true, triggered: triggeredCount });

  } catch (error: any) {
    console.error("Critical Alert Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}