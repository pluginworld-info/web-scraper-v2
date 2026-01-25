import { BaseScraper, ScrapedProduct } from './engine/base';
import * as cheerio from 'cheerio';

export class PluginBoutiqueScraper extends BaseScraper {
  retailerDomain = 'pluginboutique.com';

  async parseProduct($: cheerio.CheerioAPI, url: string): Promise<ScrapedProduct | null> {
    try {
      let title = '';
      let price = 0;
      let image = '';

      // 1. Try Meta Tags first (Standard)
      const metaPrice = $('meta[property="product:price:amount"]').attr('content');
      if (metaPrice) price = parseFloat(metaPrice);

      const metaTitle = $('meta[property="og:title"]').attr('content');
      if (metaTitle) title = metaTitle.replace('| Plugin Boutique', '').trim();

      // 2. Try Specific Selectors (The "New Layout" fix)
      if (!price) {
        // Look for the big price on the right side
        const priceText = $('.price-amount').text() || 
                          $('.current-price').text() || 
                          $('.price').first().text();
        
        // specific fix for Scaler 3 page layout
        const heroPrice = $('div[class*="hero"] span[class*="price"]').text();
        
        const textToParse = heroPrice || priceText;
        if (textToParse) {
             const extracted = parseFloat(textToParse.replace(/[^0-9.]/g, ''));
             if (!isNaN(extracted)) price = extracted;
        }
      }

      // 3. The "Nuclear Option" (Find ANY dollar sign)
      if (!price) {
        console.log("⚠️ Meta/Class lookup failed. Scanning for $ symbol...");
        $('body *').each((i, el) => {
            if (price > 0) return; // Stop if found
            const txt = $(el).text().trim();
            // Look for "$49.00" or "$ 49.00"
            if (txt.match(/^\$\s?[0-9]+(\.[0-9]{2})?$/)) {
                price = parseFloat(txt.replace(/[^0-9.]/g, ''));
            }
        });
      }

      // Fallback for Title
      if (!title) title = $('h1').text().trim();

      if (title && price > 0) {
        return {
          url,
          title,
          price,
          currency: 'USD',
          inStock: true,
          image: image || ''
        };
      }
      
      // If we STILL fail, log the whole H1 and a snippet to debug
      console.log(`❌ FAILED. Title found: "${title}". Price found: ${price}`);
      return null;

    } catch (e) {
      console.error(e);
      return null;
    }
  }
}