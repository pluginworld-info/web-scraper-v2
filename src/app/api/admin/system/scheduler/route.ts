import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

// ---------------------------------------------------------
// 1. IMPORT & TYPE SUPPRESSION
// ---------------------------------------------------------
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
    
    // 2. Fetch Job
    const [job] = await client.getJob({ name });

    if (!job || !job.schedule) {
       return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // ---------------------------------------------------------
    // 🛡️ RUNTIME ADAPTER (The Fix)
    // ---------------------------------------------------------
    // Cast to 'any' so TypeScript stops complaining about .default
    const lib = rawCronParser as any;

    let parseExpression = lib.parseExpression;
    
    // Check if it's hidden inside .default (CommonJS/ESM mismatch fix)
    if (!parseExpression && lib.default) {
        parseExpression = lib.default.parseExpression;
    }

    if (typeof parseExpression !== 'function') {
        throw new Error("Could not find parseExpression in cron-parser library");
    }

    // 3. Execute
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
    
    // Fallback: Return "Tomorrow" so UI doesn't crash
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return NextResponse.json({ 
      error: error.message || "Unknown Error",
      nextRunTime: tomorrow.toISOString()
    }, { status: 500 });
  }
}