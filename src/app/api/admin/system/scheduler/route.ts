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
    // ✅ FIX: Convert Google Timestamp to Standard String
    // ---------------------------------------------------------
    let cleanLastRunTime = null;

    if (job.lastAttemptTime) {
        // Check if it is a Google Timestamp Object (has 'seconds')
        if (typeof job.lastAttemptTime === 'object' && 'seconds' in job.lastAttemptTime) {
            // Convert seconds to milliseconds
            const seconds = Number(job.lastAttemptTime.seconds);
            cleanLastRunTime = new Date(seconds * 1000).toISOString();
        } 
        // Fallback: If it's already a date or string
        else {
            cleanLastRunTime = new Date(job.lastAttemptTime as any).toISOString();
        }
    }

    return NextResponse.json({
      schedule: job.schedule,
      state: job.state,
      lastRunTime: cleanLastRunTime, // 👈 Now sends a clean string ("2026-02-05...")
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