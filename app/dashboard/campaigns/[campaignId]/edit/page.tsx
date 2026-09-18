// app/campaigns/[campaignId]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { CampaignForm, CampaignFormData } from '@/components/campaigns/CampaignForm';
import { useParams, useRouter } from 'next/navigation';
import { updateCampaign } from '@/lib/actions/campaigns';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const [initialData, setInitialData] = useState<Partial<CampaignFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch campaign');
        }
        const data = await response.json();
        // Convert dates from ISO strings to Date objects
        const campaignData: Partial<CampaignFormData> = {
          ...data.campaign,
          startDate: data.campaign.startDate ? new Date(data.campaign.startDate) : undefined,
          endDate: data.campaign.endDate ? new Date(data.campaign.endDate) : undefined,
        };
        setInitialData(campaignData);
      } catch (error) {
        console.error('Error fetching campaign:', error);
        toast.error('Failed to load campaign');
        router.push('/campaigns');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId, router]);

  const handleSubmit = async (data: CampaignFormData) => {
    const payload = {
      ...data,
      startDate: data.startDate?.toISOString(),
      endDate: data.endDate?.toISOString(),
    };
    
    const result = await updateCampaign(campaignId, payload);
    if (result.success) {
      router.push(`/campaigns/${campaignId}`);
    }
    return result;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Edit Campaign</h1>
      <CampaignForm 
        campaignId={campaignId}
        initialData={initialData || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  );
}