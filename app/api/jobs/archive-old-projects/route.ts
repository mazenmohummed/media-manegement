// app/api/jobs/archive-old-projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { archiveOldProjectsJob } from '@/jobs/archive-old-projects';
import { verifyQStashSignature } from '@/lib/qstash';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const isValid = await verifyQStashSignature(req);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await archiveOldProjectsJob();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ARCHIVE_OLD_PROJECTS_JOB]', error);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}