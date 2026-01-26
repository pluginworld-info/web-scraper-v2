import { NextResponse } from 'next/server';
// Use the relative path that worked for your directory structure
import { SweetwaterScraper } from '@/lib/scrapers/sweetwater';
import { PluginBoutiqueScraper } from '@/lib/scrapers/pluginboutique';

// Force dynamic execution (no caching)
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds

export async function GET() {
  try {
    console.log("⚠️ TRIGGER RECEIVED: Starting Cloud Test (Phase 2: Tier 2 Sites)...");

    // Initialize scrapers
    // const sw = new SweetwaterScraper(); // Commented out to save resources
    const pb = new PluginBoutiqueScraper();

    // 1. SKIP SWEETWATER (Tier 1 - Requires Residential Proxy)
    // We comment this out so the request doesn't fail on the strict firewall.
    /* const swResult = await sw.scrapeURL('https://www.sweetwater.com/store/detail/SM58--shure-sm58-cardioid-dynamic-vocal-microphone') as any;
    */
    // We create a "dummy" result so your frontend structure doesn't break
    const swResult = { title: 'Skipped (Tier 1 Security)', price: 0, success: false };
    
    // 2. RUN PLUGIN BOUTIQUE (Tier 2 - Should work with Webshare)
    console.log("👉 Scraper 1: Plugin Boutique...");
    const pbResult = await pb.scrapeURL('https://www.pluginboutique.com/product/2-Effects/16-EQ/5114-FabFilter-Pro-Q-3') as any;

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
          success: !!pbResult,
          // Use optional chaining (?.) to prevent crashing if null
          title: pbResult?.title || 'No Title Found',
          price: pbResult?.price || 0,
          image: pbResult?.image || 'No Image'
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