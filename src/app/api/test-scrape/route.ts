import { NextResponse } from 'next/server';
// Use the relative path that worked for your directory structure
import { SweetwaterScraper } from '@/lib/scrapers/sweetwater';
import { PluginBoutiqueScraper } from '@/lib/scrapers/pluginboutique';
import { JrrShopScraper } from '@/lib/scrapers/jrrshop';
import { AudioDeluxeScraper } from '@/lib/scrapers/audiodeluxe';
import { EveryPluginScraper } from '@/lib/scrapers/everyplugin';
// import { BestServiceScraper } from '@/lib/scrapers/bestservice'; // COMMENTED OUT FOR NOW

// Force dynamic execution (no caching)
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds

export async function GET() {
  try {
    console.log("⚠️ TRIGGER RECEIVED: Starting Cloud Test (Focus: EveryPlugin Fix)...");

    // Initialize scrapers
    const jrr = new JrrShopScraper();
    const ad = new AudioDeluxeScraper();
    const ep = new EveryPluginScraper();
    // const bs = new BestServiceScraper(); // COMMENTED OUT

    // 1. SKIP SWEETWATER
    const swResult = { title: 'Skipped (Tier 1 Security)', price: 0, success: false };
    
    // 2. SKIP PLUGIN BOUTIQUE
    const pbResult = { title: 'Skipped (Tier 2 Security)', price: 0, success: false };

    // 3. RUN JRR SHOP (Already Working)
    console.log("👉 Scraper 1: JRR Shop...");
    const jrrUrl = 'https://www.jrrshop.com/xln-audio-xo-pak-uk-garage.html';
    const jrrResult = await jrr.scrapeURL(jrrUrl) as any;

    // 4. RUN AUDIODELUXE (Already Working)
    console.log("👉 Scraper 2: AudioDeluxe...");
    const adUrl = 'https://audiodeluxe.com/collections/on-sale/products/uvi-beatbox-anthology-2';
    const adResult = await ad.scrapeURL(adUrl) as any;

    // 5. RUN EVERYPLUGIN (Testing Homepage Warmup Bypass)
    console.log("👉 Scraper 3: EveryPlugin...");
    // Target: FabFilter Pro-Q 3
    const epUrl = 'https://everyplugin.com/pro-q-3.html';
    const epResult = await ep.scrapeURL(epUrl) as any;

    // 6. BEST SERVICE (SKIPPED)
    // const bsUrl = 'https://www.bestservice.com/en/fabfilter_pro_q_3.html';
    // const bsResult = await bs.scrapeURL(bsUrl) as any;

    return NextResponse.json({
      status: 'completed',
      environment: process.env.NODE_ENV,
      results: {
        sweetwater: {
          success: false,
          note: "Skipped until Residential Proxies are active"
        },
        plugin_boutique: {
          success: false,
          note: "Skipped - Requires Residential Proxy"
        },
        jrr_shop: {
          success: !!jrrResult && !!jrrResult.title && !jrrResult.title.includes('Whoops'),
          title: jrrResult?.title || 'No Title Found',
          price: jrrResult?.price || 0,
          image: jrrResult?.image || 'No Image',
          url: jrrUrl
        },
        audio_deluxe: {
          success: !!adResult && !!adResult.title && !adResult.title.includes('Page Not Found'),
          title: adResult?.title || 'No Title Found',
          price: adResult?.price || 0,
          image: adResult?.image || 'No Image',
          url: adUrl
        },
        every_plugin: {
          // STRICT CHECK: Fail if we are still stuck on Cloudflare loading screen
          success: !!epResult && 
                   !!epResult.title && 
                   epResult.title !== 'Error' && 
                   !epResult.title.includes('Just a moment') && 
                   epResult.title !== 'everyplugin.com',

          debug_page_title: epResult?.debug_title || 'No Page Loaded',
          title: epResult?.title || 'No Title Found',
          price: epResult?.price || 0,
          image: epResult?.image || 'No Image',
          url: epUrl
        },
        best_service: {
          success: false,
          note: "Skipped to focus on EveryPlugin"
        }
      }
    });

  } catch (error: any) {
    console.error("❌ SCRAPE FAILED:", error);
    return NextResponse.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
} 