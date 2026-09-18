// app/dashboard/campaign-health/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { CampaignHealthDashboard } from '@/components/campaigns/CampaignHealthDashboard';

export const metadata = {
  title: 'Campaign Health | Agency Platform',
  description: 'Monitor campaign performance and health status',
};

export default async function CampaignHealthPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;
  if (!agencyId) {
    redirect('/onboarding');
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Campaign Health Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor performance across all active ad campaigns. Automatic optimization tasks are created when thresholds are breached.
        </p>
      </div>
      <CampaignHealthDashboard />
    </div>
  );
}