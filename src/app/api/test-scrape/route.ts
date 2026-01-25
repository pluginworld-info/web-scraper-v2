import { NextResponse } from 'next/server';
import { SweetwaterScraper } from '../../../../lib/scrapers/sweetwater';
import { PluginBoutiqueScraper } from '../../../../lib/scrapers/pluginboutique';

// Force this route to be dynamic (so it doesn't cache the result)
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds for the scrape

export async function GET() {
  try {
    console.log("⚠️ TRIGGER RECEIVED: Starting Cloud Test...");

    // 1. Test Sweetwater (The "PerimeterX" Test)
    const sw = new SweetwaterScraper();
    // Use the SM58 as our control
    const swResult = await sw.scrapeURL('https://www.sweetwater.com/store/detail/SM58--shure-sm58-cardioid-dynamic-vocal-microphone');
    
    // 2. Test Plugin Boutique (The "Antivirus" Test)
    const pb = new PluginBoutiqueScraper();
    // Use the standard FabFilter URL
    const pbResult = await pb.scrapeURL('https://www.pluginboutique.com/product/2-Effects/16-EQ/5114-FabFilter-Pro-Q-3');

    // 3. Report Results
    return NextResponse.json({
      status: 'completed',
      environment: process.env.NODE_ENV,
      is_cloud_run: true,
      results: {
        sweetwater: {
          success: !!swResult,
          title: swResult?.title || 'FAILED',
          price: swResult?.price || 0,
        },
        plugin_boutique: {
          success: !!pbResult,
          title: pbResult?.title || 'FAILED',
          price: pbResult?.price || 0,
        }
      }
    });

  } catch (error: any) {
    console.error("❌ SCRAPE FAILED:", error);
    return NextResponse.json({ 
      status: 'error', 
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}