// components/digital-ads/DigitalAdCampaignList.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DigitalAdCampaign, AdPlatform, DigitalCampaignStatus, Project } from '@prisma/client';

interface DigitalAdCampaignWithMetrics extends DigitalAdCampaign {
  metrics: {
    reach: number;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    revenue: number;
  }[];
}

interface DigitalAdCampaignListProps {
  project: Project & {
    digitalAdCampaigns: DigitalAdCampaignWithMetrics[];
  };
}

const statusColors: Record<DigitalCampaignStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

const platformIcons: Record<AdPlatform, string> = {
  FACEBOOK: '📘',
  INSTAGRAM: '📸',
  TIKTOK: '🎵',
  GOOGLE: '🔍',
  YOUTUBE: '▶️',
  SNAPCHAT: '👻',
  X: '🐦',
  LINKEDIN: '💼',
  OTHER: '📊',
};

// ✅ Helper to build correct paths
const buildPath = (projectId: string, subPath: string = '') => {
  return `/dashboard/projects/${projectId}/digital-ads${subPath}`;
};

export function DigitalAdCampaignList({ project }: DigitalAdCampaignListProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleStatusUpdate = async (adId: string, status: DigitalCampaignStatus) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/digital-ads/${adId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      toast.success(`Ad campaign status updated to ${status}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleDelete = async (adId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ad campaign "${name}"?`)) {
      return;
    }

    setIsDeleting(adId);
    try {
      const response = await fetch(`/api/projects/${project.id}/digital-ads/${adId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete ad campaign');
      }

      toast.success('Ad campaign deleted successfully');
      router.refresh();
    } catch (error) {
      console.error('Error deleting ad campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete ad campaign');
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusActions = (adId: string, status: DigitalCampaignStatus) => {
    const actions = [];

    if (status === 'DRAFT' || status === 'PAUSED') {
      actions.push({
        label: 'Activate',
        icon: Play,
        action: () => handleStatusUpdate(adId, 'ACTIVE'),
        variant: 'default' as const,
      });
    }

    if (status === 'ACTIVE') {
      actions.push({
        label: 'Pause',
        icon: Pause,
        action: () => handleStatusUpdate(adId, 'PAUSED'),
        variant: 'outline' as const,
      });
      actions.push({
        label: 'Complete',
        icon: CheckCircle,
        action: () => handleStatusUpdate(adId, 'COMPLETED'),
        variant: 'secondary' as const,
      });
    }

    return actions;
  };

  if (project.digitalAdCampaigns.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Ad Campaigns</h3>
        <p className="text-muted-foreground mb-4">
          Create your first digital ad campaign for this project
        </p>
        {/* ✅ Fixed path */}
        <Button onClick={() => router.push(buildPath(project.id, '/new'))}>
          Create Ad Campaign
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Digital Ad Campaigns</h2>
          <p className="text-muted-foreground">
            Manage ad campaigns for {project.name}
          </p>
        </div>
        {/* ✅ Fixed path */}
        <Button onClick={() => router.push(buildPath(project.id, '/new'))}>
          New Ad Campaign
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Metrics</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.digitalAdCampaigns.map((ad) => {
              const latestMetric = ad.metrics[0];
              const statusActions = getStatusActions(ad.id, ad.status);

              return (
                <TableRow key={ad.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{ad.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ad.audienceSegment && `🎯 ${ad.audienceSegment}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{platformIcons[ad.platform]}</span>
                      <span>{ad.platform}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{ad.currency} {ad.budget.toLocaleString()}</div>
                      {ad.pixelId && (
                        <div className="text-xs text-muted-foreground">
                          Pixel: {ad.pixelId}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[ad.status]}>
                      {ad.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {latestMetric ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex gap-4">
                          <span>Reach: {latestMetric.reach.toLocaleString()}</span>
                          <span>Impressions: {latestMetric.impressions.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Clicks: {latestMetric.clicks.toLocaleString()}</span>
                          <span>Spend: {ad.currency} {latestMetric.spend.toLocaleString()}</span>
                          <span>Conversions: {latestMetric.conversions.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No data yet</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {ad.startDate ? format(new Date(ad.startDate), 'MMM d, yyyy') : 'Not set'}
                      {ad.endDate && (
                        <> - {format(new Date(ad.endDate), 'MMM d, yyyy')}</>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {statusActions.map((action, index) => (
                        <Button
                          key={index}
                          variant={action.variant}
                          size="sm"
                          onClick={action.action}
                        >
                          <action.icon className="w-3 h-3 mr-1" />
                          {action.label}
                        </Button>
                      ))}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* ✅ Fixed paths */}
                          <DropdownMenuItem
                            onClick={() => router.push(buildPath(project.id, `/${ad.id}`))}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(buildPath(project.id, `/${ad.id}/edit`))}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(buildPath(project.id, `/${ad.id}/metrics`))}
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Metrics
                          </DropdownMenuItem>
                          {ad.landingPageUrl && (
                            <DropdownMenuItem
                              onClick={() => window.open(ad.landingPageUrl!, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open Landing Page
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(ad.id, ad.name)}
                            disabled={isDeleting === ad.id}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {isDeleting === ad.id ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}