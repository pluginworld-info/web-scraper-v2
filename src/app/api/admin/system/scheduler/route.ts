import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

// ---------------------------------------------------------
// 🛡️ SAFE IMPORT LOGIC (Fixes "u.parseExpression" Error)
// ---------------------------------------------------------
// We require the library, then manually find the function.
// This handles both Local Dev (CommonJS) and Cloud Run (Webpack/ESM)
const cronLib = require('cron-parser');
const parseExpression = cronLib.parseExpression || (cronLib.default && cronLib.default.parseExpression);

// Double check it loaded
if (typeof parseExpression !== 'function') {
  console.error("❌ CRITICAL: Could not load cron-parser. Lib structure:", Object.keys(cronLib));
}
// ---------------------------------------------------------

// ✅ YOUR HARDCODED CONFIG (Keep these as they are)
const PROJECT_ID = 'plugin-scraper-v2'; // Replace if you haven't already
const LOCATION_ID = 'us-central1';
const JOB_ID = 'daily-feed-sync'; 

const client = new CloudSchedulerClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!parseExpression) {
        throw new Error("Server failed to load cron parser library");
    }

    if (!PROJECT_ID) {
      return NextResponse.json({ error: "Missing Project ID Config" }, { status: 500 });
    }

    const name = client.jobPath(PROJECT_ID, LOCATION_ID, JOB_ID);
    
    // Fetch Job from Google Cloud
    const [job] = await client.getJob({ name });

    if (!job || !job.schedule) {
       return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // ✅ USE THE SAFE FUNCTION WE FOUND EARLIER
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
    
    // Return the actual error message so the UI shows it
    return NextResponse.json({ 
      error: error.message || "Unknown Error",
      nextRunTime: null // Stop the UI from guessing
    }, { status: 500 });
  }
}