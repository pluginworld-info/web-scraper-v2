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
    console.log("⏰ Cron Job Started: Gathering Feeds...");

    // 2. Fetch feeds (skip ones that are somehow already syncing)
    const feeds = await prisma.feed.findMany({
      where: { status: { not: 'SYNCING' } },
      orderBy: { name: 'asc' } // Predictable alphabetical order
    });

    if (feeds.length === 0) {
      return NextResponse.json({ message: "No feeds to sync." });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://pluginworld.info';

    // =======================================================================
    // ⚡ FIRE AND FORGET ORCHESTRATOR
    // We run the massive sequential loop in the background so the Cron Scheduler
    // gets an instant success response and doesn't timeout!
    // =======================================================================
    const runSequentialFeeds = async () => {
      console.log(`🚀 Background Orchestrator taking over ${feeds.length} feeds...`);

      for (const feed of feeds) {
        try {
          console.log(`\n👉 Triggering Feed: ${feed.name}`);
          
          // A. Fire the trigger
          fetch(`${baseUrl}/api/admin/sync`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              // ⚡ THE GHOST COOKIE: We pass the CRON_SECRET as a fake session cookie
              // so your middleware.ts lets this server-to-server request through!
              'Cookie': `admin_session=${process.env.CRON_SECRET}` 
            },
            body: JSON.stringify({ feedId: feed.id })
          }).catch(err => {
             // Ignore dropped HTTP connection, background job keeps going
          });

          // Give the database 3 seconds to officially register the 'SYNCING' status
          await new Promise(resolve => setTimeout(resolve, 3000));

          // B. THE WAITING ROOM (Direct Database Polling)
          let isRunning = true;
          let elapsedSeconds = 0;
          const timeoutSeconds = 3600; // 1 hour max per feed

          while (isRunning && elapsedSeconds < timeoutSeconds) { 
             const check = await prisma.feed.findUnique({
                 where: { id: feed.id },
                 select: { status: true, processedItems: true, totalItems: true }
             });

             if (!check || check.status !== 'SYNCING') {
                 isRunning = false;
                 console.log(`✅ Finished: ${feed.name}. Final Status: ${check?.status}`);
             } else {
                 if (elapsedSeconds % 15 === 0) {
                     console.log(`   ⏳ Still syncing ${feed.name}... (${check.processedItems}/${check.totalItems})`);
                 }
                 // Wait 15 seconds
                 await new Promise(resolve => setTimeout(resolve, 15000)); 
                 // ⚡ FIX: Added 15 seconds instead of 5
                 elapsedSeconds += 15; 
             }
          }

          if (isRunning) {
              console.error(`❌ Timeout: ${feed.name} exceeded 1 hour.`);
          }

        } catch (err: any) {
          console.error(`❌ Failed to process ${feed.name}:`, err.message);
        }
      }

      console.log("\n🏁 Cron Job Finished ALL Feeds safely.");
    };

    // ⚡ Kick off the loop without awaiting it
    runSequentialFeeds();

    // ⚡ Instantly reply to Google Cloud Scheduler so it doesn't timeout
    return NextResponse.json({ 
      success: true, 
      message: `Background sync triggered for ${feeds.length} feeds.` 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}