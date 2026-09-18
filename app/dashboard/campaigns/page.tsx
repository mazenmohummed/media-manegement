// app/dashboard/campaigns/page.tsx
import { Suspense } from 'react';
import { CampaignList } from '@/components/campaigns/CampaignList';
import { CampaignFilters } from '@/components/campaigns/CampaignFilters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Campaigns | Agency Platform',
  description: 'Manage your marketing campaigns',
};

export default async function CampaignsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage client campaigns and track performance
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>
      
      <CampaignFilters />
      
      <Suspense fallback={<div>Loading campaigns...</div>}>
        <CampaignList />
      </Suspense>
    </div>
  );
}