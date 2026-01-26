import puppeteer from 'puppeteer';

export class PluginBoutiqueScraper {
  async scrapeURL(url: string) {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ];

    // 1. Add Proxy if configured in Cloud Run
    if (process.env.PROXY_HOST) {
      args.push(`--proxy-server=${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`);
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: args
    });

    try {
      const page = await browser.newPage();

      // 2. BANDWIDTH SAVER: Block Images, Fonts, CSS
      // This reduces data usage by 95%, allowing you to scrape 6,000 pages instead of 300.
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // 3. Authenticate Proxy
      if (process.env.PROXY_USER && process.env.PROXY_PASS) {
        await page.authenticate({
          username: process.env.PROXY_USER,
          password: process.env.PROXY_PASS,
        });
      }

      // 4. Scrape logic
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Increased timeout to 60s for slow proxies
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Extraction Logic
      const data = await page.evaluate(() => {
        const title = document.querySelector('.product-heading h1')?.textContent?.trim();
        const priceText = document.querySelector('.price-text')?.textContent?.trim();
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;
        
        // We get the IMAGE URL even though we blocked the image download!
        const image = document.querySelector('.product-image img')?.getAttribute('src');

        return { title, price, image };
      });

      return data;

    } catch (error) {
      console.error(`Scrape failed for ${url}:`, error);
      return null;
    } finally {
      await browser.close();
    }
  }
}