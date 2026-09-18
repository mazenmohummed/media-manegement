// app/campaigns/new/page.tsx
'use client';

import { CampaignForm } from '@/components/campaigns/CampaignForm';
import { useRouter } from 'next/navigation';
import { createCampaign } from '@/lib/actions/campaigns';

export default function NewCampaignPage() {
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    const result = await createCampaign(data);
    if (result.success) {
      router.push(`/dashboard/campaigns/${result.id}`);
    }
    return result;
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Create New Campaign</h1>
      <CampaignForm onSubmit={handleSubmit} />
    </div>
  );
}