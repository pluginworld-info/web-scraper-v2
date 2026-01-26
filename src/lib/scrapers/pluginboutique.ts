// 1. Change to 'puppeteer-extra' for Stealth Mode
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 2. Enable the Stealth Plugin (Tricks Cloudflare)
puppeteer.use(StealthPlugin());

// Helper function to pause execution (simulating human reading)
const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time));

export class PluginBoutiqueScraper {
  async scrapeURL(url: string) {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', 
      '--window-size=1920,1080', // Look like a desktop monitor
    ];

    // Add Proxy if configured
    if (process.env.PROXY_HOST) {
      args.push(`--proxy-server=${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`);
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: args
    });

    try {
      const page = await browser.newPage();

      // 3. Authenticate Proxy
      if (process.env.PROXY_USER && process.env.PROXY_PASS) {
        await page.authenticate({
          username: process.env.PROXY_USER,
          password: process.env.PROXY_PASS,
        });
      }

      // 4. MAX STEALTH: Set Standard Browser Headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      });

      // 5. Set Viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // 6. BANDWIDTH SAVER
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // 7. Set Real User Agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // 8. Go to URL with longer timeout
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // --- NEW: THE HUMAN PAUSE ---
      // Wait for 2 to 5 seconds randomly. This tricks "Time-on-Page" checks.
      const randomWait = Math.floor(Math.random() * 3000) + 2000; // 2000ms - 5000ms
      await delay(randomWait); 
      // ----------------------------

      // 9. DEBUG: Check Page Title
      const pageTitle = await page.title(); 
      console.log(`🔎 Loaded Page Title: "${pageTitle}"`);

      // 10. Extract Data
      const data = await page.evaluate(() => {
        const title = document.querySelector('.product-heading h1')?.textContent?.trim() || 
                      document.querySelector('h1')?.textContent?.trim();
                      
        const priceText = document.querySelector('.price-text')?.textContent?.trim() ||
                          document.querySelector('.price')?.textContent?.trim();
                          
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;
        
        const image = document.querySelector('.product-image img')?.getAttribute('src') ||
                      document.querySelector('img[itemprop="image"]')?.getAttribute('src');

        return { title, price, image };
      });

      return { ...data, debug_title: pageTitle };

    } catch (error) {
      console.error(`Scrape failed for ${url}:`, error);
      return null;
    } finally {
      await browser.close();
    }
  }
}