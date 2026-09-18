// app/dashboard/projects/[projectId]/digital-ads/[adId]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { DigitalAdForm, DigitalAdFormData } from '@/components/digital-ads/DigitalAdForm';
import { useParams, useRouter } from 'next/navigation';
import { updateDigitalAdCampaign } from '@/lib/actions/digital-ads';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function EditDigitalAdPage() {
  const params = useParams();
  const router = useRouter();
  
  // ✅ Fix: use 'projectId' not 'id'
  const projectId = params.projectId as string;
  const adId = params.adId as string;
  
  const [initialData, setInitialData] = useState<Partial<DigitalAdFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/digital-ads/${adId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch ad campaign');
        }
        const data = await response.json();
        const adData: Partial<DigitalAdFormData> = {
          ...data.adCampaign,
          startDate: data.adCampaign.startDate ? new Date(data.adCampaign.startDate) : undefined,
          endDate: data.adCampaign.endDate ? new Date(data.adCampaign.endDate) : undefined,
        };
        setInitialData(adData);
      } catch (error) {
        console.error('Error fetching ad:', error);
        toast.error('Failed to load ad campaign');
        // ✅ Fixed path
        router.push(`/dashboard/projects/${projectId}/digital-ads`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAd();
  }, [projectId, adId, router]);

  const handleSubmit = async (data: DigitalAdFormData) => {
    const payload = {
      ...data,
      projectId,
      startDate: data.startDate?.toISOString(),
      endDate: data.endDate?.toISOString(),
    };
    
    const result = await updateDigitalAdCampaign(adId, payload);
    if (result.success) {
      // ✅ Fixed path
      router.push(`/dashboard/projects/${projectId}/digital-ads`);
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
      <h1 className="text-3xl font-bold mb-8">Edit Digital Ad Campaign</h1>
      <DigitalAdForm 
        projectId={projectId} 
        adId={adId}
        initialData={initialData || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  );
}