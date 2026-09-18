// components/campaigns/CampaignList.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  campaignNo: string;
  name: string;
  objective?: string;
  budget: number;
  currency: string;
  startDate: string;
  endDate?: string;
  status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  client: {
    id: string;
    clientName: string;
  };
  _count: {
    projects: number;
    digitalAdCampaigns: number;
  };
}

export function CampaignList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const statusColors: Record<string, string> = {
    PLANNED: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const clientId = searchParams.get('clientId');
        
        if (status) params.append('status', status);
        if (search) params.append('search', search);
        if (clientId) params.append('clientId', clientId);

        const response = await fetch(`/api/campaigns?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch campaigns');
        }
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        toast.error('Failed to load campaigns');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, [searchParams]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      toast.success('Campaign deleted successfully');
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading campaigns...</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No campaigns found</p>
        <Button 
          className="mt-4"
          onClick={() => router.push('/dashboard/campaigns/new')}
        >
          Create your first campaign
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Ad Campaigns</TableHead>
            <TableHead>Date Range</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{campaign.name}</div>
                  <div className="text-xs text-muted-foreground">
                    #{campaign.campaignNo}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span>{campaign.client.clientName}</span>
                </div>
              </TableCell>
              <TableCell>
                {campaign.currency} {campaign.budget.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge className={statusColors[campaign.status]}>
                  {campaign.status}
                </Badge>
              </TableCell>
              <TableCell>{campaign._count.projects}</TableCell>
              <TableCell>{campaign._count.digitalAdCampaigns}</TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(new Date(campaign.startDate), 'MMM d, yyyy')}
                  {campaign.endDate && (
                    <> - {format(new Date(campaign.endDate), 'MMM d, yyyy')}</>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/campaigns/${campaign.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/campaigns/${campaign.id}/projects`)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDelete(campaign.id, campaign.name)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}