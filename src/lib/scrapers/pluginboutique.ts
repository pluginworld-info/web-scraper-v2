import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time));

const cleanEnv = (val: string | undefined) => {
  if (!val) return '';
  return val.replace(/(https?:\/\/|socks5:\/\/)/g, '').replace(/\/$/, '').trim();
};

export class PluginBoutiqueScraper {
  async scrapeURL(productUrl: string) {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ];

    const rawHost = cleanEnv(process.env.PROXY_HOST);
    const rawPort = cleanEnv(process.env.PROXY_PORT);

    if (rawHost && rawPort) {
      const proxyUrl = `http://${rawHost}:${rawPort}`;
      console.log(`🔌 Configuring Proxy: ${proxyUrl}`); 
      args.push(`--proxy-server=${proxyUrl}`);
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: args
    });

    try {
      const page = await browser.newPage();

      if (process.env.PROXY_USER && process.env.PROXY_PASS) {
        await page.authenticate({
          username: process.env.PROXY_USER ? process.env.PROXY_USER.trim() : '',
          password: process.env.PROXY_PASS ? process.env.PROXY_PASS.trim() : '',
        });
      }

      await page.setViewport({ width: 1920, height: 1080 });

      // Headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      });

      // Bandwidth Saver
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

      // --- STEP 1: WARM UP ON HOMEPAGE ---
      console.log("🔥 Warming up session on Homepage...");
      try {
        await page.goto('https://www.pluginboutique.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000); // Wait 3 seconds for cookies to set
      } catch (e) {
        console.warn("Homepage load warning (proceeding anyway):", e);
      }

      // --- STEP 2: GO TO PRODUCT ---
      console.log(`🚀 Navigating to Product: ${productUrl}`);
      await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Human Pause
      const randomWait = Math.floor(Math.random() * 2000) + 1000;
      await delay(randomWait);

      // DEBUG: Capture Final URL & Title
      const pageTitle = await page.title();
      const currentUrl = page.url();
      console.log(`🔎 Loaded Title: "${pageTitle}"`);
      console.log(`📍 Final URL: "${currentUrl}"`);

      // CHECK: Did we get redirected to home?
      if (currentUrl === 'https://www.pluginboutique.com/' || pageTitle.includes('VST Plugins, Synth Presets')) {
         throw new Error('Soft Block: Redirected to Homepage');
      }

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
      console.error(`❌ Scrape failed for ${productUrl}:`, error);
      return { 
        title: 'Error', 
        debug_title: `Error: ${error instanceof Error ? error.message : String(error)}`, 
        price: 0 
      };
    } finally {
      await browser.close();
    }
  }
}