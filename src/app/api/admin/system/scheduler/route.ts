import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

// ✅ CONFIG
const PROJECT_ID = 'composite-haiku-480406-b5';
const LOCATION_ID = 'us-central1';
const JOB_ID = 'sync-product-feeds';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // ⚡ FIX: Explicitly inject credentials for Vercel
    let clientOptions: any = {};
    if (process.env.GCLOUD_CREDENTIALS) {
        clientOptions.credentials = JSON.parse(process.env.GCLOUD_CREDENTIALS);
    }
    
    const client = new CloudSchedulerClient(clientOptions);
    const name = client.jobPath(PROJECT_ID, LOCATION_ID, JOB_ID);
    const [job] = await client.getJob({ name });

    if (!job) {
       return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Convert Google Timestamp to Standard String
    let cleanLastRunTime = null;

    if (job.lastAttemptTime) {
        if (typeof job.lastAttemptTime === 'object' && 'seconds' in job.lastAttemptTime) {
            const seconds = Number(job.lastAttemptTime.seconds);
            cleanLastRunTime = new Date(seconds * 1000).toISOString();
        } else {
            cleanLastRunTime = new Date(job.lastAttemptTime as any).toISOString();
        }
    } else {
        // Fallback if the job has literally never been run yet
        cleanLastRunTime = new Date().toISOString(); 
    }

    return NextResponse.json({
      schedule: job.schedule,
      state: job.state,
      lastRunTime: cleanLastRunTime, 
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