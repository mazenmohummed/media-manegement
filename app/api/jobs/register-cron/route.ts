// app/api/jobs/register-cron/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Hourly sync
  await qstash.schedules.create({
    destination: `${baseUrl}/api/jobs/sync-agency-files`,
    cron: '0 * * * *', // every hour
  });

  // Daily archive at 2 AM UTC
  await qstash.schedules.create({
    destination: `${baseUrl}/api/jobs/archive-old-projects`,
    cron: '0 2 * * *',
  });

  return NextResponse.json({ success: true });
}