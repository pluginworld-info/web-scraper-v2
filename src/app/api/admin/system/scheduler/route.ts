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

    if (!job) {
       return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // ---------------------------------------------------------
    // ✅ SIMPLIFIED BACKEND (No Libraries)
    // ---------------------------------------------------------
    // We strictly pass the raw "lastAttemptTime".
    // The Frontend will do the "+30 mins" math.
    
    return NextResponse.json({
      schedule: job.schedule,      // e.g., "*/30 * * * *"
      state: job.state,            // e.g., "ENABLED"
      lastRunTime: job.lastAttemptTime, // 👈 The raw timestamp from Google
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