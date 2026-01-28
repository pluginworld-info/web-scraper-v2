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

      // --- STEP 1: WARM UP ON HOMEPAGE ---
      console.log("🔥 Warming up session on EveryPlugin Homepage...");
      try {
        await page.goto('https://everyplugin.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000); 
        await page.mouse.move(Math.random() * 500, Math.random() * 500);
      } catch (e) {
        console.warn("Homepage warm-up warning (proceeding anyway):", e);
      }

      // --- STEP 2: NAVIGATE TO PRODUCT ---
      console.log(`🚀 Navigating to Product: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

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

      // 10. Extract Data (SURGICAL SELECTORS BASED ON PAGE SOURCE)
      const data = await page.evaluate(() => {
        // --- TITLE ---
        // Based on source: <h1 itemprop="name">Pro-Q 4</h1>
        const h1Title = document.querySelector('h1[itemprop="name"]')?.textContent?.trim();
        const boxTitle = document.querySelector('.product-name h1')?.textContent?.trim();
        const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        
        const title = h1Title || boxTitle || metaTitle || document.title.split('|')[0]?.trim();

        // --- PRICE ---
        // Based on source: Prices can be in .price-box .price (regular) 
        // OR hidden behind "Log in" text.
        const specialPrice = document.querySelector('.special-price .price')?.textContent?.trim();
        const regularPrice = document.querySelector('.regular-price .price')?.textContent?.trim();
        const anyPrice = document.querySelector('.price-box .price')?.textContent?.trim(); 
        
        const priceText = specialPrice || regularPrice || anyPrice;
        let price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;

        // Check if price is hidden (Map Pricing)
        const priceBoxText = document.querySelector('.price-box')?.textContent?.toLowerCase() || '';
        if (price === 0 && (priceBoxText.includes('log in') || priceBoxText.includes('too low'))) {
             // Return -1 to indicate "Login Required" instead of "Free"
             price = -1; 
        }

        // --- IMAGE ---
        // Based on source: <img id="image" ... src="..."> (This is 900x900)
        const idImage = document.querySelector('img#image')?.getAttribute('src');
        const zoomImage = document.querySelector('a#cloudZoom')?.getAttribute('href');
        const metaImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');

        let image = idImage || zoomImage || metaImage;

        return { title, price, image };
      });

      // --- IMAGE CLEANING ---
      if (data.image) {
         // Fix relative URLs
         if (data.image.startsWith('/')) {
             data.image = `https://everyplugin.com${data.image}`;
         }
         // Clean Cache URLs if found (Source had: /cache/1/image/900x900/...)
         if (data.image.includes('/cache/')) {
            // Logic: Remove everything before the first /p/ or /x/ folder structure usually
            // Source example: .../cache/.../9df.../p/r/pro-q.jpg
            // We want: .../media/catalog/product/p/r/pro-q.jpg
            const match = data.image.match(/\/([a-zA-Z0-9])\/([a-zA-Z0-9])\/([^\/]+)$/);
            if (match) {
                data.image = `https://everyplugin.com/media/catalog/product${match[0]}`;
            }
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