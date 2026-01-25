import { BaseScraper, ScrapedProduct } from './engine/base';
import * as cheerio from 'cheerio';

export class SweetwaterScraper extends BaseScraper {
  retailerDomain = 'sweetwater.com';

  async parseProduct($: cheerio.CheerioAPI, url: string): Promise<ScrapedProduct | null> {
    try {
      let title = '';
      let price = 0;
      let image = '';
      let inStock = true;
      let currency = 'USD';

      // ============================================
      // STRATEGY 1: JSON-LD (Structured Data)
      // ============================================
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}');
          if (json['@type'] === 'Product') {
            title = json.name;
            image = json.image;
            if (json.offers) {
              price = parseFloat(json.offers.price);
              currency = json.offers.priceCurrency;
              inStock = json.offers.availability?.includes('InStock');
            }
          }
        } catch (e) {}
      });

      // ============================================
      // STRATEGY 2: Meta Tags (If JSON failed)
      // ============================================
      if (!price) {
        const metaPrice = $('meta[property="product:price:amount"]').attr('content') || 
                          $('meta[name="twitter:data1"]').attr('content');
        if (metaPrice) price = parseFloat(metaPrice);

        const metaTitle = $('meta[property="og:title"]').attr('content');
        if (metaTitle) title = metaTitle;

        const metaImage = $('meta[property="og:image"]').attr('content');
        if (metaImage) image = metaImage || '';
      }

      // ============================================
      // STRATEGY 3: Visual Selectors (The "Human" view)
      // ============================================
      if (!price) {
        // Try to find the price in the H1 or a specific price class
        // Sweetwater often puts price in .product-price--final
        const priceText = $('product-price, .product-price--final, .price').first().text();
        const extracted = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        if (!isNaN(extracted)) price = extracted;
      }

      if (!title) {
        title = $('h1').first().text().trim();
      }

      // ============================================
      // FINAL VALIDATION
      // ============================================
      if (title && price > 0) {
        return {
          url,
          title: title.trim(),
          price,
          currency,
          inStock,
          image
        };
      }

      // Debugging: If we fail, tell us what the page actually claimed to be
      console.log("⚠️ DEBUG: Could not extract price. Page H1 was:", $('h1').text());
      return null;

    } catch (e) {
      console.error(e);
      return null;
    }
  }
}