// components/campaigns/CampaignsTab.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Campaign {
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

export interface Client {
  id: string;
  clientName: string;
  clientNo: string | null;
}

export interface CampaignsTabProps {
  initialCampaigns?: Campaign[];
  initialClients?: Client[];
  showHeader?: boolean;
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

const statusOptions = [
  { value: 'ALL', label: 'All Status' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// ─── Loading Component ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function CampaignsTab({
  initialCampaigns = [],
  initialClients = [],
  showHeader = true,
  onCampaignSelect,
}: CampaignsTabProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [clients] = useState<Client[]>(initialClients);
  const [isLoading, setIsLoading] = useState(!initialCampaigns.length);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedClient, setSelectedClient] = useState<string>('ALL');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  // ─── Fetch Campaigns ──────────────────────────────────────────────────

  useEffect(() => {
    if (!initialCampaigns.length) {
      fetchCampaigns();
    }
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
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

    if (selectedClient !== 'ALL') {
      filtered = filtered.filter((c) => c.client.id === selectedClient);
    }

    if (activeTab === 'active') {
      filtered = filtered.filter((c) => c.status === 'ACTIVE');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter((c) => c.status === 'COMPLETED');
    } else if (activeTab === 'planned') {
      filtered = filtered.filter((c) => c.status === 'PLANNED');
    }

    return filtered;
  }, [campaigns, search, selectedStatus, selectedClient, activeTab]);

  // ─── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === 'ACTIVE').length;
    const completed = campaigns.filter((c) => c.status === 'COMPLETED').length;
    const planned = campaigns.filter((c) => c.status === 'PLANNED').length;
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);

    return { total, active, completed, planned, totalBudget };
  }, [campaigns]);

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
          c.id === id ? { ...c, status: status as Campaign['status'] } : c
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
    setSelectedClient('ALL');
    setActiveTab('all');
  };

  // ─── Loading State ────────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Campaigns</h2>
            <p className="text-sm text-muted-foreground">
              Manage and track all your marketing campaigns
            </p>
          </div>
          <Link href="/dashboard/campaigns/new">
            <Button className="gap-1">
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">All campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.planned}</p>
            <p className="text-xs text-muted-foreground">In planning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${stats.totalBudget.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Combined budget</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="planned">Planned</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
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
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {clients.length > 0 && (
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="h-9 px-3 border rounded-md bg-background text-sm"
              >
                <option value="ALL">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.clientName}
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2"
            >
              <FilterX className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Ads</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Calendar className="w-8 h-8 text-muted-foreground/50" />
                          <p>No campaigns found</p>
                          <p className="text-sm">Create your first campaign to get started</p>
                          <Link href="/dashboard/campaigns/new">
                            <Button size="sm" className="mt-2 gap-1">
                              <Plus className="w-4 h-4" />
                              New Campaign
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <TableRow
                        key={campaign.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleCampaignClick(campaign.id)}
                      >
                        <TableCell>
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
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{campaign.client.clientName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[campaign.status]}>
                            <span className="flex items-center gap-1">
                              {statusIcons[campaign.status]}
                              {campaign.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            <span>
                              {campaign.currency} {campaign.budget.toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign._count.projects}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign._count.digitalAdCampaigns}</Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CampaignsTab;