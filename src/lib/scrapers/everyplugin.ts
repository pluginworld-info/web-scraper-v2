import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 1. Enable Stealth Mode
puppeteer.use(StealthPlugin());

// 2. Helper to clean proxy variables
const cleanEnv = (val: string | undefined) => {
  if (!val) return '';
  return val.replace(/(https?:\/\/|socks5:\/\/)/g, '').replace(/\/$/, '').trim();
};

// 3. Human Pause Helper
const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time));

export class EveryPluginScraper {
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
      console.log(`🔌 EveryPlugin Proxy: ${proxyUrl}`); 
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

      // 7. Bandwidth Saver (Allow scripts this time for Cloudflare challenge)
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

      // --- STEP 1: WARM UP ON HOMEPAGE ---
      console.log("🔥 Warming up session on EveryPlugin Homepage...");
      try {
        await page.goto('https://everyplugin.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for Cloudflare "Checking..." to resolve on the homepage
        console.log("⏳ Waiting for Cloudflare clearance on Homepage...");
        await delay(5000); 

        // Mouse Jiggle on Homepage to prove humanity
        await page.mouse.move(Math.random() * 500, Math.random() * 500);
        await delay(2000);

      } catch (e) {
        console.warn("Homepage warm-up warning (proceeding anyway):", e);
      }

      // --- STEP 2: NAVIGATE TO PRODUCT ---
      console.log(`🚀 Navigating to Product: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Wait again in case the challenge re-appears
      try {
         await page.waitForSelector('.product-name, h1', { timeout: 15000 });
         console.log("✅ Content loaded.");
      } catch(e) {
         console.warn("⚠️ Potential Challenge on Product Page");
      }

      // 9. Human Pause
      const randomWait = Math.floor(Math.random() * 2000) + 2000;
      await delay(randomWait);

      // Debugging
      const pageTitle = await page.title();
      console.log(`🔎 Loaded Title: "${pageTitle}"`);

      // 10. Extract Data
      const data = await page.evaluate(() => {
        const title = document.querySelector('.product-name h1')?.textContent?.trim() ||
                      document.querySelector('h1')?.textContent?.trim() ||
                      document.title.split('|')[0]?.trim();

        const specialPrice = document.querySelector('.special-price .price')?.textContent?.trim();
        const regularPrice = document.querySelector('.regular-price .price')?.textContent?.trim();
        const standardPrice = document.querySelector('.price-box .price')?.textContent?.trim();

        const priceText = specialPrice || regularPrice || standardPrice;
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;

        const zoomImage = document.querySelector('#zoom1')?.getAttribute('href');
        const mainImage = document.querySelector('.product-img-box .product-image img')?.getAttribute('src') ||
                          document.querySelector('#image-main')?.getAttribute('src');
        
        let image = zoomImage || mainImage;

        return { title, price, image };
      });

      // --- IMAGE CLEANING ---
      if (data.image && data.image.includes('/cache/')) {
         const match = data.image.match(/\/([a-zA-Z0-9])\/([a-zA-Z0-9])\/([^\/]+)$/);
         if (match) {
             data.image = `https://everyplugin.com/media/catalog/product${match[0]}`;
         }
      }

      return { ...data, debug_title: pageTitle };

    } catch (error) {
      console.error(`❌ EveryPlugin Scrape failed:`, error);
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