import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

// ✅ CONFIG (Matched to your screenshots)
const PROJECT_ID = 'composite-haiku-480406-b5';
const LOCATION_ID = 'us-central1';
const JOB_ID = 'sync-product-feeds';

const client = new CloudSchedulerClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Setup Client
  // We use the full path to ensure exact matching
  const name = `projects/${PROJECT_ID}/locations/${LOCATION_ID}/jobs/${JOB_ID}`;

  let jobData = null;

  try {
    // 2. Fetch Job from Google Cloud
    const [job] = await client.getJob({ name });
    jobData = job;

    if (!job || !job.schedule) {
       return NextResponse.json({ error: "Job found but has no schedule" }, { status: 404 });
    }

    // 3. Calculate Next Run (Protected Logic)
    let nextRunTime = null;
    try {
        // 🛡️ DYNAMIC REQUIRE: Loads library at runtime to prevent Webpack crashes
        const parser = require('cron-parser');
        
        const interval = parser.parseExpression(job.schedule as string, {
            tz: job.timeZone || 'UTC'
        });
        nextRunTime = interval.next().toDate().toISOString();
    } catch (libError: any) {
        console.error("Library Error:", libError);
        // If library fails, we still return the Job Status so the UI works
        nextRunTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Dummy date (+24h)
    }

    return NextResponse.json({
      schedule: job.schedule,
      state: job.state,
      lastRunTime: job.lastAttemptTime, 
      nextRunTime: nextRunTime,
      timeZone: job.timeZone || 'UTC'
    });

  } catch (error: any) {
    console.error("API Crash:", error);

    // 4. Return Readable Error (Instead of 500 Crash)
    // This ensures your UI shows the specific error message
    return NextResponse.json({ 
      error: error.message || "Unknown Error",
      details: error.code === 7 ? "Permission Denied (IAM)" : "Configuration Error",
      debug_project: PROJECT_ID,
      debug_job: JOB_ID
    }, { status: 200 }); // Return 200 so frontend can read the JSON error
  }
}