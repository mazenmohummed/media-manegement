// app/dashboard/digital-ads/new/page.tsx
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DigitalAdForm } from '@/components/digital-ads/DigitalAdForm';
import { createDigitalAdCampaign } from '@/lib/actions/digital-ads';

export default async function NewDigitalAdPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;

  // Fetch all projects for this agency (to optionally link the campaign)
  const projects = await db.project.findMany({
    where: {
      agencyId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      projectNo: true,
      client: { select: { clientName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  async function handleCreate(data: any) {
    'use server';
    const result = await createDigitalAdCampaign(data);
    if (result.success && result.id) {
      redirect(`/dashboard/digital-ads/${result.id}`);
    }
    return result;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/digital-ads"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Digital Ads
      </Link>

      <div>
        <h1 className="text-3xl font-bold">New Digital Ad Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new ad campaign. Optionally link it to a project.
        </p>
      </div>

      <DigitalAdFormWrapper projects={projects} onCreate={handleCreate} />
    </div>
  );
}

// Wrapper client component (see below)
import { DigitalAdFormWrapper } from '@/components/digital-ads/DigitalAdFormWrapper';