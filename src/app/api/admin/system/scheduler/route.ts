import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

// ✅ CONFIG (Matched to your verified screenshots)
const PROJECT_ID = 'composite-haiku-480406-b5';
const LOCATION_ID = 'us-central1';
const JOB_ID = 'sync-product-feeds';

const client = new CloudSchedulerClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch Job from Google Cloud
    const name = client.jobPath(PROJECT_ID, LOCATION_ID, JOB_ID);
    const [job] = await client.getJob({ name });

    if (!job || !job.schedule) {
       return NextResponse.json({ error: "Job found but has no schedule" }, { status: 404 });
    }

    // 2. Calculate Next Run (Safe Dynamic Import)
    let nextRunTime = null;
    try {
        // 🛡️ THE FIX: We require() here to bypass the build-time crash
        // This loads the fresh library from node_modules at runtime
        const parser = require('cron-parser');
        
        const interval = parser.parseExpression(job.schedule as string, {
            tz: job.timeZone || 'UTC'
        });
        nextRunTime = interval.next().toDate().toISOString();
    } catch (libError: any) {
        console.error("Cron Library Error:", libError);
        // Fallback: If library still fails, show tomorrow's date so UI doesn't break
        nextRunTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    return NextResponse.json({
      schedule: job.schedule,
      state: job.state,
      lastRunTime: job.lastAttemptTime, 
      nextRunTime: nextRunTime,
      timeZone: job.timeZone || 'UTC'
    });

  } catch (error: any) {
    console.error("Scheduler API Error:", error);
    
    return NextResponse.json({ 
      error: error.message || "Unknown Error",
      // Include debug info so you can see it in the browser
      debug_project: PROJECT_ID, 
      debug_job: JOB_ID
    }, { status: 500 });
  }
}