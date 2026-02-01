import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Re-use the logic from your single sync route or import a shared helper.
// For simplicity, we will fetch the feeds and trigger them here.

export async function GET(req: Request) {
  // 1. Security Check (Optional but Recommended)
  // Verify a secret token so strangers can't trigger your scraper
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("⏰ Cron Job Started: Syncing All Feeds...");

    // 2. Fetch all IDLE or ERROR feeds (skip ones currently syncing)
    const feeds = await prisma.feed.findMany({
      where: {
        status: { not: 'SYNCING' }
      }
    });

    if (feeds.length === 0) {
      return NextResponse.json({ message: "No feeds to sync." });
    }

    // 3. Trigger Sync for each (Sequential to save memory, or Parallel for speed)
    const results = [];
    
    // We get the base URL of the site to call our own API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scraper-engine-v2-776546486462.us-central1.run.app/';

    for (const feed of feeds) {
      try {
        console.log(`   👉 Triggering: ${feed.name}`);
        
        // We call the admin sync endpoint we already built
        const res = await fetch(`${baseUrl}/api/admin/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedId: feed.id })
        });
        
        const data = await res.json();
        results.push({ id: feed.id, success: res.ok, data });
        
      } catch (err: any) {
        console.error(`   ❌ Failed to trigger ${feed.name}:`, err.message);
        results.push({ id: feed.id, success: false, error: err.message });
      }
    }

    console.log("✅ Cron Job Finished.");
    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}