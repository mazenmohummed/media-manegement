// app/dashboard/projects/[projectId]/digital-ads/page.tsx
import { DigitalAdCampaignList } from '@/components/digital-ads/DigitalAdCampaignList';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

interface DigitalAdsPageProps {
  params: Promise<{ projectId: string }>; // ✅ Promise-based + correct param name
}

export default async function DigitalAdsPage({ params }: DigitalAdsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;
  if (!agencyId) {
    redirect('/onboarding');
  }

  // ✅ Await params (Next.js 15+)
  const { projectId } = await params;

  // ✅ Validate projectId exists
  if (!projectId) {
    console.error('[DigitalAdsPage] Missing projectId in params');
    notFound();
  }

  // ✅ Use findFirst instead of findUnique (because of agencyId filter)
  const project = await prisma.project.findFirst({
    where: {
      id: projectId, // ✅ Use projectId, not params.id
      agencyId: agencyId,
      deletedAt: null,
    },
    include: {
      digitalAdCampaigns: {
        where: {
          deletedAt: null,
        },
        include: {
          metrics: {
            orderBy: {
              date: 'desc',
            },
            take: 1,
            select: {
              reach: true,
              impressions: true,
              clicks: true,
              spend: true,
              conversions: true,
              revenue: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      client: {
        select: {
          id: true,
          clientName: true,
        },
      },
      agency: {
        select: {
          id: true,
          agencyName: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <DigitalAdCampaignList project={project} />
    </div>
  );
}