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
    console.log(`📡 Status Code Received: ${result.status}`);
    
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
      console.log(`   HTML Snippet: ${result.data.substring(0, 500)}...`);
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
    await prisma.priceHistory.create({
      data: {
        price: data.price,
        listingId: listing.id,
      },
    });

    // ---------------------------------------------------------
    // ⚡ 3. INSTANT ALERT TRIGGER (The Fix)
    // ---------------------------------------------------------
    
    // Only check alerts if this listing is actually linked to a Product
    if (listing.productId) {
        
        // Find alerts for this product where:
        // A) The Alert hasn't been fired yet (isTriggered: false)
        // B) The User's Target Price is GREATER OR EQUAL to the new scraped price
        const activeAlerts = await prisma.priceAlert.findMany({
            where: {
                productId: listing.productId,
                isTriggered: false,
                targetPrice: { gte: data.price } 
            },
            include: { product: true } // Include product details for the email
        });

        if (activeAlerts.length > 0) {
            console.log(`⚡ Found ${activeAlerts.length} matching alerts! Sending emails...`);

            // Send all emails in parallel
            await Promise.all(activeAlerts.map(async (alert) => {
                try {
                    // Send the email
                    await sendPriceAlertEmail(
                        alert.email,
                        alert.product.title,
                        data.price,
                        alert.targetPrice,
                        listing.url // Direct link to the store deal
                    );

                    // Mark as Triggered so we don't spam them
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