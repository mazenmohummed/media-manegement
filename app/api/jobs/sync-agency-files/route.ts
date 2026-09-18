// app/api/jobs/sync-agency-files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncAgencyFilesJob } from '@/jobs/sync-agency-files';
import { verifyQStashSignature } from '@/lib/qstash'; // see step 3

export const runtime = 'nodejs'; // needed for @upstash/qstash

export async function POST(req: NextRequest) {
  // Verify the request actually came from QStash
  const isValid = await verifyQStashSignature(req);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await syncAgencyFilesJob();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SYNC_AGENCY_FILES_JOB]', error);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}