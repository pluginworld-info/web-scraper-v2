import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { scheduleScrape } from './queue';

puppeteer.use(StealthPlugin());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

interface FetchResult {
  data: string;
  status: number;
  url: string;
}

export async function fetchPage(url: string): Promise<FetchResult | null> {
  return scheduleScrape(url, async () => {
    let browser = null;
    try {
      // DETECT ENVIRONMENT
      // If we are in Docker/Cloud Run, 'TIER' is usually set, or we can check NODE_ENV
      const isProduction = process.env.NODE_ENV === 'production';
      
      console.log(`🚀 Launching Browser (Mode: ${isProduction ? 'HEADLESS (Cloud)' : 'VISIBLE (Dev)'})...`);

      browser = await puppeteer.launch({
        headless: isProduction ? true : false, // Auto-switch
        defaultViewport: null,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            // Cloud Run often needs this to prevent memory crashes
            '--disable-dev-shm-usage', 
            // Stealth flags
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
        ],
        executablePath: isProduction ? '/usr/bin/google-chrome' : undefined, // Docker usually installs Chrome here
      });

      const page = await browser.newPage();
      
      // Block heavier media to save Cloud Run bandwidth
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'media', 'font'].includes(resourceType) && isProduction) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent(USER_AGENT);
      
      console.log(`📡 Navigating to: ${url}`);
      
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (!response) throw new Error("No response received");

      // --- STABILITY & BYPASS LOOP ---
      // (Kept identical to your working version)
      let attempts = 0;
      let finalTitle = "";
      
      while (attempts < 30) { 
        try {
            finalTitle = await page.title();
        } catch (e) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }

        if (finalTitle.includes("Access to this page has been denied") || 
            finalTitle.includes("Just a moment") || 
            finalTitle.includes("Human Verification")) {
            
            // In Production, we can't manually solve, so we wait longer hoping it clears
            console.log(`⚠️ Block detected in ${isProduction ? 'Headless' : 'Visible'} mode. Waiting...`);
            await new Promise(r => setTimeout(r, 3000));
            attempts++;
        } 
        else {
            console.log(`✅ Title: "${finalTitle}"`);
            // Wait for dynamic pricing
            await new Promise(r => setTimeout(r, 5000)); 
            break;
        }
      }

      const content = await page.content();
      const finalUrl = page.url();

      return {
        data: content,
        status: 200,
        url: finalUrl,
      };

    } catch (error: any) {
      console.error(`❌ Browser Error: ${error.message}`);
      return null;
    } finally {
      if (browser) await browser.close();
    }
  });
}