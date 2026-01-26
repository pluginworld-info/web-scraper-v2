import { NextResponse } from 'next/server';
// Use the relative path that worked for your directory structure
import { SweetwaterScraper } from '@/lib/scrapers/sweetwater';
import { PluginBoutiqueScraper } from '@/lib/scrapers/pluginboutique';
import { JrrShopScraper } from '@/lib/scrapers/jrrshop';

// Force dynamic execution (no caching)
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds

export async function GET() {
  try {
    console.log("⚠️ TRIGGER RECEIVED: Starting Cloud Test (Phase 2: Tier 2 Sites)...");

    // Initialize scrapers
    // const pb = new PluginBoutiqueScraper();
    const jrr = new JrrShopScraper();

    // 1. SKIP SWEETWATER (Tier 1 - Requires Residential Proxy)
    // We create a "dummy" result so your frontend structure doesn't break
    const swResult = { title: 'Skipped (Tier 1 Security)', price: 0, success: false };
    
    // 2. SKIP PLUGIN BOUTIQUE (Tier 2 - Blocks Data Center IPs)
    const pbResult = { title: 'Skipped (Tier 2 Security)', price: 0, success: false };

    /* // OLD PB CODE (Kept for later when you get PacketStream)
    console.log("👉 Scraper 1: Plugin Boutique...");
    const pbResult = await pb.scrapeURL('https://www.pluginboutique.com/product/2-Effects/16-EQ/5114-FabFilter-Pro-Q-3') as any;
    */

    // 3. RUN JRR SHOP (Tier 3 - Should work with Free Webshare)
    console.log("👉 Scraper 1: JRR Shop...");
    // --- UPDATED URL HERE ---
    const jrrUrl = 'https://www.jrrshop.com/xln-audio-xo-pak-uk-garage.html';
    const jrrResult = await jrr.scrapeURL(jrrUrl) as any;

    return NextResponse.json({
      status: 'completed',
      environment: process.env.NODE_ENV,
      results: {
        sweetwater: {
          success: false,
          title: swResult.title,
          price: swResult.price,
          note: "Skipped until Residential Proxies are active"
        },
        plugin_boutique: {
          success: false,
          note: "Skipped - Requires Residential Proxy for reliable access"
        },
        jrr_shop: {
          success: !!jrrResult && !!jrrResult.title && !jrrResult.title.includes('Whoops'),
          
          // Debugging Info
          debug_page_title: jrrResult?.debug_title || 'No Page Loaded',
          
          // Data
          title: jrrResult?.title || 'No Title Found',
          price: jrrResult?.price || 0,
          image: jrrResult?.image || 'No Image',
          url: jrrUrl
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