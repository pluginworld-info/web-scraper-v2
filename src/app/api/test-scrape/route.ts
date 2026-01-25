import { NextResponse } from 'next/server';
// Use the relative path that worked for your directory structure
import { SweetwaterScraper } from '@/lib/scrapers/sweetwater';
import { PluginBoutiqueScraper } from '@/lib/scrapers/pluginboutique';

// Force dynamic execution (no caching)
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds

export async function GET() {
  try {
    console.log("⚠️ TRIGGER RECEIVED: Starting Cloud Test...");

    const sw = new SweetwaterScraper();
    const pb = new PluginBoutiqueScraper();

    // ERROR FIX: We add "as any" to tell TypeScript "Trust me, this has data"
    const swResult = await sw.scrapeURL('https://www.sweetwater.com/store/detail/SM58--shure-sm58-cardioid-dynamic-vocal-microphone') as any;
    
    const pbResult = await pb.scrapeURL('https://www.pluginboutique.com/product/2-Effects/16-EQ/5114-FabFilter-Pro-Q-3') as any;

    return NextResponse.json({
      status: 'completed',
      environment: process.env.NODE_ENV,
      results: {
        sweetwater: {
          success: !!swResult,
          // Use optional chaining (?.) to prevent crashing if null
          title: swResult?.title || 'No Title Found',
          price: swResult?.price || 0,
        },
        plugin_boutique: {
          success: !!pbResult,
          title: pbResult?.title || 'No Title Found',
          price: pbResult?.price || 0,
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