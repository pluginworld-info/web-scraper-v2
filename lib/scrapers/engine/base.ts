import { prisma } from '../../db/prisma'; // Keep your working relative import
import { fetchPage } from './fetcher';
import * as cheerio from 'cheerio';

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
      // If it's a 403, it means we are still being blocked.
      // If it's a 404, the URL is wrong.
      return;
    }
    // --- DEBUGGING BLOCK END ---

    // 3. Parse Data
    const $ = cheerio.load(result.data);
    const data = await this.parseProduct($, result.url);

    if (!data) {
      console.error(`❌ Failed to parse data (Selectors didn't match anything)`);
      // Optional: Log a snippet to see what we actually got
      console.log(`   HTML Snippet: ${result.data.substring(0, 500)}...`);
      return;
    }

    // 4. Save to Database
    await this.saveData(data, retailer.id);
  }

  abstract parseProduct($: cheerio.CheerioAPI, url: string): Promise<ScrapedProduct | null>;

  private async saveData(data: ScrapedProduct, retailerId: string) {
    console.log(`💾 Saving: ${data.title} - $${data.price}`);

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

    await prisma.priceHistory.create({
      data: {
        price: data.price,
        listingId: listing.id,
      },
    });
  }
}