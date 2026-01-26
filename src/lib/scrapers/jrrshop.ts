import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 1. Enable Stealth Mode
puppeteer.use(StealthPlugin());

// 2. Helper to clean proxy variables
const cleanEnv = (val: string | undefined) => {
  if (!val) return '';
  return val.replace(/(https?:\/\/|socks5:\/\/)/g, '').replace(/\/$/, '').trim();
};

// 3. Human Pause Helper (THIS WAS MISSING BEFORE)
const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time));

export class JrrShopScraper {
  async scrapeURL(url: string) {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ];

    // 4. Proxy Config
    const rawHost = cleanEnv(process.env.PROXY_HOST);
    const rawPort = cleanEnv(process.env.PROXY_PORT);

    if (rawHost && rawPort) {
      const proxyUrl = `http://${rawHost}:${rawPort}`;
      console.log(`🔌 JRR Shop Proxy: ${proxyUrl}`); 
      args.push(`--proxy-server=${proxyUrl}`);
    }

    const browser = await puppeteer.launch({ headless: true, args });

    try {
      const page = await browser.newPage();

      // 5. Authenticate Proxy
      if (process.env.PROXY_USER && process.env.PROXY_PASS) {
        await page.authenticate({
          username: process.env.PROXY_USER,
          password: process.env.PROXY_PASS,
        });
      }

      await page.setViewport({ width: 1920, height: 1080 });

      // 6. Headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      });

      // 7. Bandwidth Saver
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // 8. User Agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

      console.log(`🚀 Navigating to JRR Shop: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // 9. Human Pause
      const randomWait = Math.floor(Math.random() * 2000) + 2000;
      await delay(randomWait);

      // Debugging
      const pageTitle = await page.title();
      console.log(`🔎 Loaded Title: "${pageTitle}"`);

      // 10. Extract Data
      const data = await page.evaluate(() => {
        const title = document.querySelector('h1')?.textContent?.trim();

        // JRR Price Logic
        const specialPrice = document.querySelector('.special-price .price')?.textContent?.trim();
        const regularPrice = document.querySelector('.regular-price .price')?.textContent?.trim();
        const standardPrice = document.querySelector('.price-box .price')?.textContent?.trim();

        const priceText = specialPrice || regularPrice || standardPrice;
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;

        const image = document.querySelector('#image-main')?.getAttribute('src') || 
                      document.querySelector('.product-image img')?.getAttribute('src');

        return { title, price, image };
      });

      return { ...data, debug_title: pageTitle };

    } catch (error) {
      console.error(`❌ JRR Scrape failed:`, error);
      return { 
        title: 'Error', 
        debug_title: `Error: ${error instanceof Error ? error.message : String(error)}`, 
        price: 0,
        image: 'No Image' 
      };
    } finally {
      await browser.close();
    }
  }
}