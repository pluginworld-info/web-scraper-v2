import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

// @ts-ignore
import rawCronParser from 'cron-parser';

// ✅ CONFIG
const PROJECT_ID = 'composite-haiku-480406-b5';
const LOCATION_ID = 'us-central1';
const JOB_ID = 'sync-product-feeds';

const client = new CloudSchedulerClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const name = client.jobPath(PROJECT_ID, LOCATION_ID, JOB_ID);
    const [job] = await client.getJob({ name });

    if (!job || !job.schedule) {
       return NextResponse.json({ error: "Job found but has no schedule" }, { status: 404 });
    }

    // ---------------------------------------------------------
    // 🛡️ UNIVERSAL FIX (Handles TS Error & Runtime Error)
    // ---------------------------------------------------------
    
    // 1. Cast to 'any' to remove the red squiggly line in your editor
    const lib = rawCronParser as any;

    // 2. Find the function whether it's in .default or root (Fixes the 23h fallback)
    const parseExpression = lib.parseExpression || (lib.default && lib.default.parseExpression);

    if (!parseExpression) {
        throw new Error("CRITICAL: parseExpression function not found in library");
    }

    // 3. Calculate
    const interval = parseExpression(job.schedule as string, {
        tz: job.timeZone || 'UTC'
    });
    
    const nextRunDate = interval.next().toDate();
    
    return NextResponse.json({
      schedule: job.schedule,
      state: job.state,
      lastRunTime: job.lastAttemptTime, 
      nextRunTime: nextRunDate.toISOString(),
      timeZone: job.timeZone || 'UTC'
    });

  } catch (error: any) {
    console.error("Scheduler API Error:", error);
    return NextResponse.json({ 
      error: error.message,
      debug: "Failed during time calculation",
      nextRunTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }, { status: 500 });
  }
}