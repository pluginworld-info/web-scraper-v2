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
    const pb = new PluginBoutiqueScraper();

    // 1. SKIP SWEETWATER (Tier 1 - Requires Residential Proxy)
    // We create a "dummy" result so your frontend structure doesn't break
    const swResult = { title: 'Skipped (Tier 1 Security)', price: 0, success: false };
    
    // 2. RUN PLUGIN BOUTIQUE (Tier 2 - Should work with Webshare + Stealth)
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
          success: !!pbResult && !!pbResult.title, // Only true if we actually got a title
          
          // DEBUG: This is critical. It tells us if we got the product page 
          // or a "Just a moment..." Cloudflare block screen.
          debug_page_title: pbResult?.debug_title || 'No Page Loaded',
          
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