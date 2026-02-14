import { prisma } from '../../db/prisma'; 
import { fetchPage } from './fetcher';
import * as cheerio from 'cheerio';
import { sendPriceAlertEmail } from '../../mailer';

export interface ScrapedProduct {
  url: string;
  title: string;
  price: number;
  currency: string;
  inStock: boolean;
  image?: string;
  description?: string;
}

export abstract class BaseScraper {
  abstract retailerDomain: string;

  async scrapeURL(url: string) {
    // 1. Get Retailer Config
    const retailer = await prisma.retailer.findFirst({
      where: { domain: { contains: this.retailerDomain } },
    });

    if (!retailer || !retailer.isEnabled) {
      console.warn(`⚠️ ${this.retailerDomain} is disabled or missing in DB.`);
      return;
    }

    // 2. Fetch HTML
    const result = await fetchPage(url);
    
    // --- DEBUGGING BLOCK START ---
    if (!result) {
      console.error(`❌ BaseScraper: Fetch returned NULL for ${url}`);
      return;
    }
    // console.log(`📡 Status Code Received: ${result.status}`);
    
    if (result.status !== 200) {
      console.error(`⛔ Stopping scrape because status is ${result.status} (Expected 200)`);
      return;
    }
    // --- DEBUGGING BLOCK END ---

    // 3. Parse Data
    const $ = cheerio.load(result.data);
    const data = await this.parseProduct($, result.url);

    if (!data) {
      console.error(`❌ Failed to parse data (Selectors didn't match anything)`);
      // console.log(`   HTML Snippet: ${result.data.substring(0, 500)}...`);
      return;
    }

    // 4. Save to Database
    await this.saveData(data, retailer.id);
  }

  abstract parseProduct($: cheerio.CheerioAPI, url: string): Promise<ScrapedProduct | null>;

  private async saveData(data: ScrapedProduct, retailerId: string) {
    console.log(`💾 Saving: ${data.title} - $${data.price}`);

    // 1. Upsert Listing
    const listing = await prisma.listing.upsert({
      where: { url: data.url },
      update: {
        title: data.title,
        price: data.price,
        inStock: data.inStock,
        lastScraped: new Date(),
      },
      create: {
        url: data.url,
        title: data.title,
        price: data.price,
        currency: data.currency,
        inStock: data.inStock,
        retailerId: retailerId,
      },
    });

    // 2. Save Price History
    // We only save history if the price is > 0
    if (data.price > 0) {
        await prisma.priceHistory.create({
        data: {
            price: data.price,
            listingId: listing.id,
        },
        });
    }

    // ---------------------------------------------------------
    // ⚡ 3. UPDATE PRODUCT METRICS (Fluctuations & MinPrice)
    // ---------------------------------------------------------
    if (listing.productId) {
        try {
            // A. Calculate Fluctuations (Last 30 Days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Fetch history for ALL listings of this product (Market Activity)
            const history = await prisma.priceHistory.findMany({
                where: {
                    listing: { productId: listing.productId },
                    date: { gte: thirtyDaysAgo }
                },
                orderBy: { date: 'asc' },
                select: { price: true }
            });

            let fluctuations = 0;
            if (history.length > 1) {
                for (let i = 1; i < history.length; i++) {
                    // Count if price changed from previous record
                    if (Math.abs(history[i].price - history[i-1].price) > 0.01) {
                        fluctuations++;
                    }
                }
            }

            // B. Update Product
            // Check current minPrice to see if we hit a new all-time low
            const product = await prisma.product.findUnique({ 
                where: { id: listing.productId },
                select: { minPrice: true }
            });

            if (product) {
                const currentMin = product.minPrice || 0;
                // Update minPrice if current price is lower than saved min (and > 0)
                const newMinPrice = (data.price > 0 && (currentMin === 0 || data.price < currentMin)) 
                    ? data.price 
                    : undefined;

                await prisma.product.update({
                    where: { id: listing.productId },
                    data: {
                        priceChangeCount: fluctuations, // ✅ Update Fluctuation Count
                        ...(newMinPrice !== undefined && { minPrice: newMinPrice }) // ✅ Update Min Price if needed
                    }
                });
            }
        } catch (err) {
            console.error("Failed to update product metrics:", err);
        }

        // ---------------------------------------------------------
        // ⚡ 4. INSTANT ALERT TRIGGER
        // ---------------------------------------------------------
        
        // Find alerts for this product where:
        // A) The Alert hasn't been fired yet (isTriggered: false)
        // B) The User's Target Price is GREATER OR EQUAL to the new scraped price
        const activeAlerts = await prisma.priceAlert.findMany({
            where: {
                productId: listing.productId,
                isTriggered: false,
                targetPrice: { gte: data.price } 
            },
            include: { product: true } 
        });

        if (activeAlerts.length > 0) {
            console.log(`⚡ Found ${activeAlerts.length} matching alerts! Sending emails...`);

            await Promise.all(activeAlerts.map(async (alert) => {
                try {
                    await sendPriceAlertEmail(
                        alert.email,
                        alert.product.title,
                        data.price,
                        alert.targetPrice,
                        listing.url 
                    );

                    await prisma.priceAlert.update({
                        where: { id: alert.id },
                        data: { 
                            isTriggered: true, 
                            triggeredAt: new Date() 
                        }
                    });
                    
                    console.log(`✅ INSTANT ALERT SENT to ${alert.email}`);
                } catch (err) {
                    console.error(`❌ Failed to send alert to ${alert.email}`, err);
                }
            }));
        }
    }
  }
}