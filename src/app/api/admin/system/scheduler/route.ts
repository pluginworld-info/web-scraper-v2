import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

// ✅ NUCLEAR FIX: Use 'require' to bypass TypeScript import errors entirely
// This works perfectly in Next.js server-side environments.
const parser = require('cron-parser');

// ✅ CLOUD CONFIG
const PROJECT_ID = process.env.GCLOUD_PROJECT_ID; 
const LOCATION_ID = process.env.GCLOUD_LOCATION_ID || 'us-central1';
const JOB_ID = process.env.GCLOUD_JOB_ID || 'daily-feed-sync'; 

const client = new CloudSchedulerClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!PROJECT_ID) {
      return NextResponse.json({ error: "Missing GCLOUD_PROJECT_ID" }, { status: 500 });
    }

    const name = client.jobPath(PROJECT_ID, LOCATION_ID, JOB_ID);
    const [job] = await client.getJob({ name });

    if (!job || !job.schedule) {
       return NextResponse.json({ error: "Job not found or has no schedule" }, { status: 404 });
    }

    // 3. Calculate Next Run Time
    // Using the 'parser' variable defined at the top
    const interval = parser.parseExpression(job.schedule as string, {
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
      nextRunTime: new Date(Date.now() + 3600 * 1000).toISOString() 
    }, { status: 500 });
  }
}