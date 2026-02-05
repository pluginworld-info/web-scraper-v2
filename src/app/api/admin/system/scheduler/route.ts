import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

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
    // ✅ STANDARD DYNAMIC IMPORT
    // ---------------------------------------------------------
    // 1. Load library only when needed (Prevents startup crash)
    const cronParser = await import('cron-parser');

    // 2. SAFETY CHECK: Handle however Next.js bundled it
    // This finds the function whether it is a Named Export or Default Export
    // @ts-ignore
    const parseExpression = cronParser.parseExpression || cronParser.default?.parseExpression;

    if (!parseExpression) {
        throw new Error("Could not find parseExpression in loaded library");
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
      debug_project: PROJECT_ID,
      debug_job: JOB_ID
    }, { status: 500 });
  }
}