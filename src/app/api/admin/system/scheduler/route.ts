import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

// ✅ NUCLEAR FIX: You MUST use 'require' here. 
// Do not use 'import' or the red squiggly lines will never go away.
const parser = require('cron-parser');

const PROJECT_ID = 'composite-haiku-480406-b5'; 
const LOCATION_ID = 'us-central1';
const JOB_ID = 'sync-product-feeds'; 

const client = new CloudSchedulerClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!PROJECT_ID) {
      // If running locally without .env, this will trigger.
      console.error("❌ Missing GCLOUD_PROJECT_ID");
      return NextResponse.json({ error: "Missing GCLOUD_PROJECT_ID" }, { status: 500 });
    }

    const name = client.jobPath(PROJECT_ID, LOCATION_ID, JOB_ID);
    
    // ⚠️ IAM PERMISSION CHECK: 
    // If this line fails on Cloud Run, your Service Account is missing the "Cloud Scheduler Viewer" role.
    const [job] = await client.getJob({ name });

    if (!job || !job.schedule) {
       return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Use the 'require'd parser
    const interval = parser.parseExpression(job.schedule as string, {
        tz: job.timeZone || 'UTC'
    });
    
    return NextResponse.json({
      schedule: job.schedule,
      state: job.state,
      lastRunTime: job.lastAttemptTime, 
      nextRunTime: interval.next().toDate().toISOString(),
      timeZone: job.timeZone || 'UTC'
    });

  } catch (error: any) {
    console.error("Scheduler API Error:", error);
    // Return a fake time so the UI doesn't say "Calculating..." forever if GCP fails
    return NextResponse.json({ 
      error: error.message,
      nextRunTime: new Date(Date.now() + 3600 * 1000).toISOString() 
    }, { status: 500 });
  }
}