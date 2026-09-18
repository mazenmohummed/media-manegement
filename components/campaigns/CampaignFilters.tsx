// components/campaigns/CampaignFilters.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

export function CampaignFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    router.push(`/dashboard/campaigns?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    router.push('/dashboard/campaigns');
  };

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Statuses</SelectItem>
          <SelectItem value="PLANNED">Planned</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="PAUSED">Paused</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Button onClick={applyFilters}>Apply Filters</Button>
      
      {(search || status) && (
        <Button variant="ghost" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}