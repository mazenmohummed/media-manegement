// app/dashboard/projects/[projectId]/digital-ads/new/page.tsx
'use client';

import { DigitalAdForm, DigitalAdFormData } from '@/components/digital-ads/DigitalAdForm';
import { useParams, useRouter } from 'next/navigation';
import { createDigitalAdCampaign } from '@/lib/actions/digital-ads';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewDigitalAdPage() {
  const params = useParams();
  const router = useRouter();
  
  // ✅ FIX 1: Use 'projectId', not 'id'
  const projectId = params.projectId as string;

  // ✅ FIX 2: Debug log to verify projectId is defined
  console.log('NewDigitalAdPage projectId:', projectId);

  const handleSubmit = async (data: DigitalAdFormData) => {
    // ✅ FIX 3: Ensure projectId is present
    if (!projectId) {
      return { success: false, error: 'Project ID is missing from URL' };
    }

    const payload = {
      ...data,
      projectId, // ✅ Now properly defined
      startDate: data.startDate?.toISOString(),
      endDate: data.endDate?.toISOString(),
    };

    console.log('Submitting digital ad campaign:', payload);

    const result = await createDigitalAdCampaign(payload);
    
    if (result.success) {
      router.push(`/dashboard/projects/${projectId}/digital-ads`);
    }
    return result;
  };

  if (!projectId) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Invalid Project ID</h1>
          <p className="text-muted-foreground mt-2">
            The project ID is missing from the URL.
          </p>
          <Link 
            href="/dashboard/projects"
            className="text-primary hover:underline mt-4 inline-block"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link
        href={`/dashboard/projects/${projectId}/digital-ads`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Digital Ads
      </Link>

      <h1 className="text-3xl font-bold mb-8">Create Digital Ad Campaign</h1>
      
      <DigitalAdForm 
        projectId={projectId} 
        onSubmit={handleSubmit}
      />
    </div>
  );
}