// app/dashboard/digital-ads/[adId]/metrics/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { MetricsForm } from '@/components/digital-ads/MetricsForm';
import { MetricsImport } from '@/components/digital-ads/MetricsImport';
import { MetricsChart } from '@/components/digital-ads/MetricsChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, FolderOpen, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface MetricsPageProps {
  params: Promise<{
    adId: string;
  }>;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export default async function DigitalAdMetricsPage({ params }: MetricsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;
  if (!agencyId) {
    redirect('/onboarding');
  }

  // ✅ Await params (Next.js 15+)
  const { adId } = await params;

  if (!adId) {
    notFound();
  }

  // ✅ Use findFirst (agencyId is not unique)
  const adCampaign = await prisma.digitalAdCampaign.findFirst({
    where: {
      id: adId,
      agencyId,
      deletedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          projectNo: true,
          client: { select: { clientName: true } },
        },
      },
      campaign: {
        select: { id: true, name: true, campaignNo: true },
      },
      _count: {
        select: { metrics: true },
      },
    },
  });

  if (!adCampaign) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Link
        href={`/dashboard/digital-ads/${adId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Campaign
      </Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{adCampaign.name}</h1>
            <Badge className={statusColors[adCampaign.status]}>
              {adCampaign.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span>{adCampaign.platform}</span>
            <span>·</span>
            <span>
              {adCampaign.currency} {adCampaign.budget.toLocaleString()} budget
            </span>
            <span>·</span>
            <span>{adCampaign._count.metrics} data points</span>
            {adCampaign.project && (
              <>
                <span>·</span>
                <Link
                  href={`/dashboard/projects/${adCampaign.project.id}`}
                  className="hover:underline inline-flex items-center gap-1"
                >
                  <FolderOpen className="w-3 h-3" />
                  {adCampaign.project.name}
                </Link>
              </>
            )}
          </div>
        </div>

        <Link href={`/dashboard/digital-ads/${adId}`}>
          <Button variant="outline" className="gap-1.5">
            <ExternalLink className="w-4 h-4" />
            View Details
          </Button>
        </Link>
      </div>

      {/* Metrics Chart */}
      <MetricsChart
        projectId={adCampaign.projectId || ''}
        adId={adId}
        adName={adCampaign.name}
        currency={adCampaign.currency}
      />

      {/* Manual Entry + Import Tabs */}
      <Tabs defaultValue="manual" className="mt-8">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="import">CSV Import</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <MetricsForm
            projectId={adCampaign.projectId || ''}
            adId={adId}
          />
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <MetricsImport
            projectId={adCampaign.projectId || ''}
            adId={adId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}