// app/dashboard/projects/[projectId]/digital-ads/[adId]/metrics/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { MetricsForm } from '@/components/digital-ads/MetricsForm';
import { MetricsImport } from '@/components/digital-ads/MetricsImport';
import { MetricsChart } from '@/components/digital-ads/MetricsChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface MetricsPageProps {
  // ✅ Promise-based params
  params: Promise<{
    projectId: string;
    adId: string;
  }>;
}

export default async function MetricsPage({ params }: MetricsPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;
  if (!agencyId) {
    redirect('/onboarding');
  }

  // ✅ Await params
  const { projectId, adId } = await params;

  // ✅ Use findFirst instead of findUnique
  const adCampaign = await prisma.digitalAdCampaign.findFirst({
    where: {
      id: adId,
      projectId: projectId,
      agencyId: agencyId,
      deletedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!adCampaign) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-8">
        {/* ✅ Fixed path */}
        <Link href={`/dashboard/projects/${projectId}/digital-ads/${adId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{adCampaign.name}</h1>
          <p className="text-muted-foreground">
            Project: {adCampaign.project?.name} · Platform: {adCampaign.platform}
          </p>
        </div>
      </div>

      <MetricsChart 
        projectId={projectId} 
        adId={adId} 
        adName={adCampaign.name}
        currency={adCampaign.currency}
      />

      <Tabs defaultValue="manual" className="mt-8">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="import">CSV Import</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="mt-4">
          <MetricsForm projectId={projectId} adId={adId} />
        </TabsContent>
        <TabsContent value="import" className="mt-4">
          <MetricsImport projectId={projectId} adId={adId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}