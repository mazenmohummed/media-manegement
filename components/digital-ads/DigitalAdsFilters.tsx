// components/digital-ads/DigitalAdsFilters.tsx (alternative with form)
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const platformLabels: Record<string, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  GOOGLE: 'Google Ads',
  YOUTUBE: 'YouTube',
  SNAPCHAT: 'Snapchat',
  X: 'X (Twitter)',
  LINKEDIN: 'LinkedIn',
  OTHER: 'Other',
};

interface DigitalAdsFiltersProps {
  initialSearch?: string;
  initialStatus?: string;
  initialPlatform?: string;
}

export function DigitalAdsFilters({
  initialSearch = '',
  initialStatus = '',
  initialPlatform = '',
}: DigitalAdsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/dashboard/digital-ads?${params.toString()}`);
  };

  const hasFilters = !!(initialSearch || initialStatus || initialPlatform);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          defaultValue={initialSearch}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateFilter('search', e.currentTarget.value);
            }
          }}
          className="pl-9"
        />
      </div>

      <select
        value={initialStatus}
        onChange={(e) => updateFilter('status', e.target.value)}
        className="h-10 px-3 border rounded-md bg-background text-sm"
      >
        <option value="">All Statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="ACTIVE">Active</option>
        <option value="PAUSED">Paused</option>
        <option value="COMPLETED">Completed</option>
      </select>

      <select
        value={initialPlatform}
        onChange={(e) => updateFilter('platform', e.target.value)}
        className="h-10 px-3 border rounded-md bg-background text-sm"
      >
        <option value="">All Platforms</option>
        {Object.entries(platformLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/digital-ads')}
          className="gap-1"
        >
          <X className="w-4 h-4" />
          Clear
        </Button>
      )}
    </div>
  );
}