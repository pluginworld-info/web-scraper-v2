import { NextResponse } from 'next/server';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

const PROJECT_ID = 'composite-haiku-480406-b5';
const LOCATION_ID = 'us-central1';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // ⚡ NEW: Make the job target dynamic via URL parameter
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId') || 'sync-product-feeds';

    let clientOptions: any = {};
    if (process.env.GCLOUD_CREDENTIALS) {
        const sanitizedCreds = process.env.GCLOUD_CREDENTIALS.replace(/\n/g, '\\n');
        clientOptions.credentials = JSON.parse(sanitizedCreds);
    }
    
    const client = new CloudSchedulerClient(clientOptions);
    const name = client.jobPath(PROJECT_ID, LOCATION_ID, jobId);
    const [job] = await client.getJob({ name });

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    let cleanLastRunTime = null;
    if (job.lastAttemptTime) {
        if (typeof job.lastAttemptTime === 'object' && 'seconds' in job.lastAttemptTime) {
            cleanLastRunTime = new Date(Number(job.lastAttemptTime.seconds) * 1000).toISOString();
        } else {
            cleanLastRunTime = new Date(job.lastAttemptTime as any).toISOString();
        }
    } else {
        cleanLastRunTime = new Date().toISOString(); 
    }

    let exactNextRun = null;
    if (job.scheduleTime) {
        if (typeof job.scheduleTime === 'object' && 'seconds' in job.scheduleTime) {
            exactNextRun = new Date(Number(job.scheduleTime.seconds) * 1000).toISOString();
        } else {
            exactNextRun = new Date(job.scheduleTime as any).toISOString();
        }
    }

    return NextResponse.json({
      schedule: job.schedule,
      state: job.state,
      lastRunTime: cleanLastRunTime, 
      nextRunTime: exactNextRun, 
      timeZone: job.timeZone || 'UTC',
      jobTargeted: jobId
    });

  } catch (error: any) {
    console.error("Scheduler API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 