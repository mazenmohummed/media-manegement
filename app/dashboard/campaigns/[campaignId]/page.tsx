// app/dashboard/campaigns/[campaignId]/page.tsx
import { CampaignDetails } from '@/components/campaigns/CampaignDetails';
import { CampaignTabs } from '@/components/campaigns/CampaignTabs';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// app/dashboard/campaigns/[campaignId]/page.tsx
interface CampaignPageProps {
  params: Promise<{
    campaignId: string;
  }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;
  if (!agencyId) {
    redirect('/onboarding');
  }

  // Await the params if it's a Promise
  const { campaignId } = await params;

  // Validate that campaignId exists
  if (!campaignId) {
    console.error('No campaignId provided in params');
    notFound();
  }

  const campaign = await prisma.campaign.findUnique({
    where: { 
      id: campaignId,
      agencyId: agencyId,
      deletedAt: null,
    },
    include: {
      client: {
        select: {
          id: true,
          clientName: true,
          clientNo: true,
        },
      },
      projects: {
        where: {
          deletedAt: null,
        },
        include: {
          digitalAdCampaigns: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              name: true,
              platform: true,
              status: true,
              budget: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              milestones: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      agency: {
        select: {
          id: true,
          agencyName: true,
        },
      },
      _count: {
        select: {
          projects: true,
          digitalAdCampaigns: true,
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <CampaignDetails campaign={campaign} />
    </div>
  );
}