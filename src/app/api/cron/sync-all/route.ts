import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Security Check
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("⏰ Cron Job Started: Syncing All Feeds Sequentially...");

    // 2. Fetch feeds (skip ones that are somehow already syncing)
    const feeds = await prisma.feed.findMany({
      where: { status: { not: 'SYNCING' } },
      orderBy: { name: 'asc' } // Predictable alphabetical order
    });

    if (feeds.length === 0) {
      return NextResponse.json({ message: "No feeds to sync." });
    }

    const results = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scraper-engine-v2-776546486462.us-central1.run.app';

    // 3. STRICT SEQUENTIAL LOOP
    for (const feed of feeds) {
      try {
        console.log(`\n👉 Triggering Feed: ${feed.name}`);
        
        // A. Fire the trigger (We don't await the final resolution to avoid HTTP timeouts)
        fetch(`${baseUrl}/api/admin/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedId: feed.id })
        }).catch(err => {
           // We expect the HTTP connection to drop eventually, we just ignore it.
           // The background process in Cloud Run keeps going.
        });

        // Give the database 2 seconds to officially register the 'SYNCING' status
        await new Promise(resolve => setTimeout(resolve, 2000));

        // B. THE WAITING ROOM (Direct Database Polling)
        let isRunning = true;
        let elapsedSeconds = 0;
        const timeoutSeconds = 3600; // 1 hour max per feed to prevent infinite zombie loops

        while (isRunning && elapsedSeconds < timeoutSeconds) {
           // Check the exact status in the database
           const check = await prisma.feed.findUnique({
               where: { id: feed.id },
               select: { status: true, processedItems: true, totalItems: true }
           });

           // If it is no longer SYNCING, the background job finished!
           if (!check || check.status !== 'SYNCING') {
               isRunning = false;
               console.log(`✅ Finished: ${feed.name}. Final Status: ${check?.status}`);
               results.push({ id: feed.id, name: feed.name, status: check?.status });
           } else {
               // Print a progress update to your terminal every 15 seconds
               if (elapsedSeconds % 15 === 0) {
                   console.log(`   ⏳ Still syncing ${feed.name}... (${check.processedItems}/${check.totalItems})`);
               }
               // Wait 5 seconds before checking the database again
               await new Promise(resolve => setTimeout(resolve, 5000)); 
               elapsedSeconds += 5;
           }
        }

        // Failsafe if a feed gets permanently stuck
        if (isRunning) {
            console.error(`❌ Timeout: ${feed.name} exceeded 1 hour.`);
            results.push({ id: feed.id, name: feed.name, status: 'TIMEOUT' });
        }

      } catch (err: any) {
        console.error(`❌ Failed to process ${feed.name}:`, err.message);
        results.push({ id: feed.id, success: false, error: err.message });
      }
    }

    console.log("\n🏁 Cron Job Finished ALL Feeds safely.");
    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}