import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Enable Stealth Mode
puppeteer.use(StealthPlugin());

// Helper for Human Pause
const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time));

export class PluginBoutiqueScraper {
  async scrapeURL(url: string) {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ];

    // --- FIX: ROBUST PROXY SETUP ---
    // We explicitly check for variables and force the 'http://' protocol
    if (process.env.PROXY_HOST && process.env.PROXY_PORT) {
      const proxyUrl = `http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
      console.log(`🔌 Configuring Proxy: ${proxyUrl}`); // Log to confirm it looks right
      args.push(`--proxy-server=${proxyUrl}`);
    } else {
      console.warn("⚠️ No Proxy Configured: Running in direct mode (High risk of blocking)");
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: args
    });

    try {
      const page = await browser.newPage();

      // Authenticate Proxy
      if (process.env.PROXY_USER && process.env.PROXY_PASS) {
        await page.authenticate({
          username: process.env.PROXY_USER,
          password: process.env.PROXY_PASS,
        });
      }

      // Headers (Human Mimicry)
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      });

      await page.setViewport({ width: 1920, height: 1080 });

      // Bandwidth Saver (Block Images)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Go to URL
      console.log(`🚀 Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Human Pause
      const randomWait = Math.floor(Math.random() * 3000) + 2000;
      await delay(randomWait);

      // DEBUG: Capture Page Title
      const pageTitle = await page.title();
      console.log(`🔎 Loaded Page Title: "${pageTitle}"`);

      // Extract Data
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
      console.error(`❌ Scrape failed for ${url}:`, error);
      // Return the error message so we can see it in the JSON response
      return { title: 'Error', debug_title: `Error: ${error instanceof Error ? error.message : String(error)}`, price: 0 };
    } finally {
      await browser.close();
    }
  }
}