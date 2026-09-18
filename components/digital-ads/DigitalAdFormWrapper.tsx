// components/digital-ads/DigitalAdFormWrapper.tsx
'use client';

import { useRouter } from 'next/navigation';
import { DigitalAdForm, DigitalAdFormData } from './DigitalAdForm';

interface Project {
  id: string;
  name: string;
  projectNo: string | null;
  client: { clientName: string };
}

interface DigitalAdFormWrapperProps {
  projects: Project[];
  onCreate: (data: any) => Promise<{ success: boolean; id?: string; error?: string }>;
}

export function DigitalAdFormWrapper({ projects, onCreate }: DigitalAdFormWrapperProps) {
  const router = useRouter();

  const handleSubmit = async (data: DigitalAdFormData) => {
    const payload = {
      ...data,
      startDate: data.startDate?.toISOString(),
      endDate: data.endDate?.toISOString(),
    };

    const result = await onCreate(payload);

    if (result.success && result.id) {
      router.push(`/dashboard/digital-ads/${result.id}`);
    }

    return result;
  };

  return <DigitalAdForm projects={projects} onSubmit={handleSubmit} />;
}