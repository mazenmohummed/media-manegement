// components/projects/tabs/ProjectCampaignsTab.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Calendar,
  DollarSign,
  Users,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Clock,
  FilterX,
  Loader2,
  Link as LinkIcon,
  X,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────

interface ProjectCampaign {
  id: string;
  campaignNo: string | null;
  name: string;
  objective: string | null;
  budget: number;
  currency: string;
  status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startDate: string | null;
  endDate: string | null;
  client: {
    id: string;
    clientName: string;
    clientNo: string | null;
  };
  _count: {
    projects: number;
    digitalAdCampaigns: number;
  };
  createdAt: string | null;
  updatedAt: string | null;
}

interface AvailableCampaign {
  id: string;
  campaignNo: string | null;
  name: string;
  objective: string | null;
  budget: number;
  currency: string;
  status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startDate: string | null;
  endDate: string | null;
  client: {
    id: string;
    clientName: string;
    clientNo: string | null;
  };
  _count: {
    projects: number;
    digitalAdCampaigns: number;
  };
}

interface ProjectCampaignsTabProps {
  projectId: string;
  initialCampaigns: ProjectCampaign[];
  onCampaignSelect?: (campaignId: string) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  PLANNED: <Clock className="w-3 h-3" />,
  ACTIVE: <PlayCircle className="w-3 h-3" />,
  PAUSED: <PauseCircle className="w-3 h-3" />,
  COMPLETED: <CheckCircle className="w-3 h-3" />,
  CANCELLED: <XCircle className="w-3 h-3" />,
};

// ─── Main Component ────────────────────────────────────────────────────

export function ProjectCampaignsTab({
  projectId,
  initialCampaigns = [],
  onCampaignSelect,
}: ProjectCampaignsTabProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<ProjectCampaign[]>(initialCampaigns);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // ─── Link Campaign States ─────────────────────────────────────────────
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [availableCampaigns, setAvailableCampaigns] = useState<AvailableCampaign[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // ─── Fetch Available Campaigns ────────────────────────────────────────

  // components/projects/tabs/ProjectCampaignsTab.tsx - Update fetchAvailableCampaigns

const fetchAvailableCampaigns = async () => {
  setIsLoadingAvailable(true);
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    params.append('excludeProjectId', projectId);
    
    const response = await fetch(`/api/campaigns/available?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch available campaigns');
    const data = await response.json();
    
    console.log('📊 Available campaigns response:', data);
    
    setAvailableCampaigns(data.campaigns || []);
    
    if (data.campaigns?.length === 0) {
      // Check if there are any campaigns at all
      const allCampaignsResponse = await fetch('/api/campaigns');
      if (allCampaignsResponse.ok) {
        const allData = await allCampaignsResponse.json();
        if (allData.campaigns?.length === 0) {
          // No campaigns exist at all
          toast.info('No campaigns found. Create your first campaign!');
        }
      }
    }
  } catch (error) {
    console.error('Error fetching available campaigns:', error);
    toast.error('Failed to load available campaigns');
  } finally {
    setIsLoadingAvailable(false);
  }
};

  // ─── Open Link Dialog ────────────────────────────────────────────────

  const openLinkDialog = () => {
    setIsLinkDialogOpen(true);
    setSearchQuery('');
    setSelectedCampaignId(null);
    fetchAvailableCampaigns();
  };

  // ─── Link Campaign ────────────────────────────────────────────────────

  const handleLinkCampaign = async () => {
    if (!selectedCampaignId) {
      toast.error('Please select a campaign to link');
      return;
    }

    setIsLinking(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/campaigns/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaignId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link campaign');
      }

      toast.success('Campaign linked successfully');
      setIsLinkDialogOpen(false);
      
      // Refresh the campaigns list
      const refreshResponse = await fetch(`/api/projects/${projectId}/campaigns`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setCampaigns(data.campaigns || []);
      }
      router.refresh();
    } catch (error) {
      console.error('Error linking campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link campaign');
    } finally {
      setIsLinking(false);
    }
  };

  // ─── Unlink Campaign ──────────────────────────────────────────────────

  const handleUnlinkCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to unlink this campaign from the project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/campaigns/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlink campaign');
      }

      toast.success('Campaign unlinked successfully');
      setCampaigns(campaigns.filter((c) => c.id !== campaignId));
      router.refresh();
    } catch (error) {
      console.error('Error unlinking campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unlink campaign');
    }
  };

  // ─── Filters ──────────────────────────────────────────────────────────

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          (c.campaignNo?.toLowerCase().includes(searchLower)) ||
          (c.objective?.toLowerCase().includes(searchLower)) ||
          c.client.clientName.toLowerCase().includes(searchLower)
      );
    }

    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter((c) => c.status === selectedStatus);
    }

    return filtered;
  }, [campaigns, search, selectedStatus]);

  // ─── Actions ──────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete campaign');
      }

      toast.success('Campaign deleted successfully');
      setCampaigns(campaigns.filter((c) => c.id !== id));
      router.refresh();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete campaign');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      toast.success(`Campaign status updated to ${status}`);
      setCampaigns(
        campaigns.map((c) =>
          c.id === id ? { ...c, status: status as ProjectCampaign['status'] } : c
        )
      );
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const campaign = campaigns.find((c) => c.id === id);
      if (!campaign) throw new Error('Campaign not found');

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${campaign.name} (Copy)`,
          objective: campaign.objective,
          budget: campaign.budget,
          currency: campaign.currency,
          clientId: campaign.client.id,
          startDate: new Date().toISOString(),
          status: 'PLANNED',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to duplicate campaign');
      }

      const result = await response.json();
      toast.success('Campaign duplicated successfully');
      router.push(`/dashboard/campaigns/${result.campaign.id}`);
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate campaign');
    }
  };

  const handleCampaignClick = (campaignId: string) => {
    if (onCampaignSelect) {
      onCampaignSelect(campaignId);
    } else {
      router.push(`/dashboard/campaigns/${campaignId}`);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedStatus('ALL');
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Campaigns</h3>
          <Badge variant="outline">{campaigns.length}</Badge>
        </div>
        <div className="flex gap-2">
          {/* Link Existing Campaign Button */}
          <Button size="sm" variant="outline" className="gap-1" onClick={openLinkDialog}>
            <LinkIcon className="w-3.5 h-3.5" />
            Link Campaign
          </Button>
          <Link href={`/dashboard/campaigns/new?clientId=${initialCampaigns[0]?.client.id || ''}`}>
            <Button size="sm" className="gap-1">
              <Plus className="w-3.5 h-3.5" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-9 px-3 border rounded-md bg-background text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="PLANNED">Planned</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2"
        >
          <FilterX className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Ads</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="w-8 h-8 text-muted-foreground/50" />
                      <p>No campaigns found</p>
                      <p className="text-sm">Create a campaign or link an existing one</p>
                      <div className="flex gap-3 mt-2">
                        <Link href={`/dashboard/campaigns/new?clientId=${initialCampaigns[0]?.client.id || ''}`}>
                          <Button size="sm" className="gap-1">
                            <Plus className="w-4 h-4" />
                            New Campaign
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline" className="gap-1" onClick={openLinkDialog}>
                          <LinkIcon className="w-4 h-4" />
                          Link Campaign
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer hover:bg-muted/50 group"
                  >
                    <TableCell onClick={() => handleCampaignClick(campaign.id)}>
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        {campaign.campaignNo && (
                          <div className="text-xs text-muted-foreground">
                            {campaign.campaignNo}
                          </div>
                        )}
                        {campaign.objective && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {campaign.objective}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleCampaignClick(campaign.id)}>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{campaign.client.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleCampaignClick(campaign.id)}>
                      <Badge className={statusColors[campaign.status]}>
                        <span className="flex items-center gap-1">
                          {statusIcons[campaign.status]}
                          {campaign.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => handleCampaignClick(campaign.id)}>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span>
                          {campaign.currency} {campaign.budget.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleCampaignClick(campaign.id)}>
                      <Badge variant="outline">{campaign._count.digitalAdCampaigns}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Unlink Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600"
                          onClick={() => handleUnlinkCampaign(campaign.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/campaigns/${campaign.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(campaign.id)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'PLANNED')}>
                              <Clock className="w-4 h-4 mr-2" />
                              Planned
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'ACTIVE')}>
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'PAUSED')}>
                              <PauseCircle className="w-4 h-4 mr-2" />
                              Paused
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'COMPLETED')}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'CANCELLED')}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelled
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(campaign.id)}
                              disabled={isDeleting === campaign.id}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {isDeleting === campaign.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── Link Campaign Dialog ────────────────────────────────────── */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Existing Campaign</DialogTitle>
            <DialogDescription>
              Select a campaign to link to this project. Only campaigns not already linked to this project will be shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns by name or number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchAvailableCampaigns();
                }}
                className="pl-9"
              />
            </div>

            {isLoadingAvailable ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableCampaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No available campaigns found</p>
                <p className="text-sm mt-1">
                  All campaigns may already be linked to this project.
                  <br />
                  <Link href={`/dashboard/campaigns/new?clientId=${initialCampaigns[0]?.client.id || ''}`} 
                        className="text-primary hover:underline">
                    Create a new campaign instead
                  </Link>
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCampaignId === campaign.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50 hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{campaign.name}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{campaign.campaignNo}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{campaign.client.clientName}</span>
                          <span>•</span>
                          <span>{campaign.currency} {campaign.budget.toLocaleString()}</span>
                          <span>•</span>
                          <span>{campaign._count.projects} projects</span>
                          <span>•</span>
                          <span>{campaign._count.digitalAdCampaigns} ads</span>
                        </div>
                      </div>
                      <Badge className={statusColors[campaign.status]}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleLinkCampaign} 
              disabled={!selectedCampaignId || isLinking}
              className="gap-1"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  Link Campaign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectCampaignsTab;