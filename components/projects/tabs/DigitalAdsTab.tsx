// components/projects/tabs/DigitalAdsTab.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Users,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Link as LinkIcon,
  ExternalLink,
  Target,
  MousePointer,
  Eye as EyeIcon,
  Zap,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Clock,
  Loader2,
  FilterX,
  Download,
  Upload,
  Globe,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
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

interface DigitalAdCampaign {
  id: string;
  name: string;
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'GOOGLE' | 'YOUTUBE' | 'SNAPCHAT' | 'X' | 'LINKEDIN' | 'OTHER';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  budget: number;
  currency: string;
  landingPageUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  pixelId: string | null;
  audienceSegment: string | null;
  startDate: string | null;
  endDate: string | null;
  lastSyncedAt: string | null;
  syncStatus: string | null;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    spend: number;
    conversions: number;
    revenue: number;
    roas: number;
    reach: number;
    leads: number;
    engagement: number;
  } | null;
  _count: {
    metrics: number;
  };
}

interface DigitalAdsTabProps {
  projectId: string;
  currency?: string;
  initialCampaigns?: DigitalAdCampaign[];
}

// ─── Platform Configuration ─────────────────────────────────────────────

const platformConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  FACEBOOK: { label: 'Facebook', icon: <Facebook className="w-4 h-4" />, color: '#1877F2' },
  INSTAGRAM: { label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: '#E4405F' },
  TIKTOK: { label: 'TikTok', icon: <Globe className="w-4 h-4" />, color: '#000000' },
  GOOGLE: { label: 'Google Ads', icon: <Globe className="w-4 h-4" />, color: '#4285F4' },
  YOUTUBE: { label: 'YouTube', icon: <Youtube className="w-4 h-4" />, color: '#FF0000' },
  SNAPCHAT: { label: 'Snapchat', icon: <Globe className="w-4 h-4" />, color: '#FFFC00' },
  X: { label: 'X (Twitter)', icon: <Twitter className="w-4 h-4" />, color: '#000000' },
  LINKEDIN: { label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, color: '#0A66C2' },
  OTHER: { label: 'Other', icon: <Globe className="w-4 h-4" />, color: '#6B7280' },
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="w-3 h-3" />,
  ACTIVE: <PlayCircle className="w-3 h-3" />,
  PAUSED: <PauseCircle className="w-3 h-3" />,
  COMPLETED: <CheckCircle2 className="w-3 h-3" />,
};

const platformOptions = [
  { value: 'ALL', label: 'All Platforms' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'GOOGLE', label: 'Google Ads' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'SNAPCHAT', label: 'Snapchat' },
  { value: 'X', label: 'X (Twitter)' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'OTHER', label: 'Other' },
];

const statusOptions = [
  { value: 'ALL', label: 'All Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
];

// ─── Main Component ────────────────────────────────────────────────────

export function DigitalAdsTab({
  projectId,
  currency = 'USD',
  initialCampaigns = [],
}: DigitalAdsTabProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<DigitalAdCampaign[]>(initialCampaigns);
  const [isLoading, setIsLoading] = useState(!initialCampaigns.length);
  const [search, setSearch] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // ─── Fetch Campaigns ──────────────────────────────────────────────────

  useEffect(() => {
    if (!initialCampaigns.length) {
      fetchCampaigns();
    }
  }, [projectId]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/digital-ads`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load digital ad campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Fetch Available Campaigns ────────────────────────────────────────

  const fetchAvailableCampaigns = async () => {
  setIsLoadingAvailable(true);
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    params.append('excludeProjectId', projectId);
    
    const response = await fetch(`/api/projects/${projectId}/digital-ads/available?${params.toString()}`);
    
    // ✅ Log the actual status for debugging
    console.log('Available campaigns API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error:', response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch available campaigns (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Available campaigns:', data);
    setAvailableCampaigns(data.campaigns || []);
  } catch (error) {
    console.error('Error fetching available campaigns:', error);
    toast.error('Failed to load available campaigns');
  } finally {
    setIsLoadingAvailable(false);
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
          c.platform.toLowerCase().includes(searchLower)
      );
    }

    if (selectedPlatform !== 'ALL') {
      filtered = filtered.filter((c) => c.platform === selectedPlatform);
    }

    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter((c) => c.status === selectedStatus);
    }

    return filtered;
  }, [campaigns, search, selectedPlatform, selectedStatus]);

  // ─── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === 'ACTIVE').length;
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.metrics?.spend || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.metrics?.impressions || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.metrics?.clicks || 0), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.metrics?.conversions || 0), 0);
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgROAS = campaigns.filter(c => c.metrics?.roas).length > 0
      ? campaigns.reduce((sum, c) => sum + (c.metrics?.roas || 0), 0) / campaigns.filter(c => c.metrics?.roas).length
      : 0;

    return { total, active, totalSpend, totalImpressions, totalClicks, totalConversions, avgCTR, avgROAS };
  }, [campaigns]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleSync = async (id: string) => {
    setIsSyncing(id);
    try {
      const response = await fetch(`/api/projects/${projectId}/digital-ads/${id}/sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync campaign');
      }

      toast.success('Campaign synced successfully');
      await fetchCampaigns();
    } catch (error) {
      console.error('Error syncing campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync campaign');
    } finally {
      setIsSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/digital-ads/sync-all`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync campaigns');
      }

      toast.success('All campaigns synced successfully');
      await fetchCampaigns();
    } catch (error) {
      console.error('Error syncing campaigns:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync campaigns');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/projects/${projectId}/digital-ads/${id}`, {
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
      const response = await fetch(`/api/projects/${projectId}/digital-ads/${id}`, {
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
          c.id === id ? { ...c, status: status as DigitalAdCampaign['status'] } : c
        )
      );
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleLinkCampaign = async () => {
    if (!selectedCampaignId) {
      toast.error('Please select a campaign to link');
      return;
    }

    setIsLinking(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/digital-ads/link`, {
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
      await fetchCampaigns();
      router.refresh();
    } catch (error) {
      console.error('Error linking campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link campaign');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to unlink this campaign from the project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/digital-ads/unlink`, {
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

  const clearFilters = () => {
    setSearch('');
    setSelectedPlatform('ALL');
    setSelectedStatus('ALL');
  };

  const openLinkDialog = () => {
    setIsLinkDialogOpen(true);
    setSearchQuery('');
    setSelectedCampaignId(null);
    fetchAvailableCampaigns();
  };

  // ─── Loading State ────────────────────────────────────────────────────

  if (isLoading) {
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

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Digital Ad Campaigns</h3>
          <Badge variant="outline">{campaigns.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={handleSyncAll}>
            <RefreshCw className="w-3.5 h-3.5" />
            Sync All
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={openLinkDialog}>
            <LinkIcon className="w-3.5 h-3.5" />
            Link Campaign
          </Button>
          <Link href={`/dashboard/projects/${projectId}/digital-ads/new`}>
            <Button size="sm" className="gap-1">
              <Plus className="w-3.5 h-3.5" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {currency} {stats.totalSpend.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.totalImpressions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.totalClicks.toLocaleString()} clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. CTR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.avgCTR.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.totalConversions} conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.avgROAS.toFixed(2)}x
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.active} active campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
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
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="h-9 px-3 border rounded-md bg-background text-sm"
        >
          {platformOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2"
        >
          <FilterX className="w-4 h-4" />
        </Button>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>ROAS</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <BarChart3 className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-lg font-medium">No digital ad campaigns found</p>
                      <p className="text-sm max-w-md">
                        {search || selectedPlatform !== 'ALL' || selectedStatus !== 'ALL'
                          ? "Try adjusting your filters"
                          : "Create your first digital ad campaign or link an existing one"}
                      </p>
                      <div className="flex gap-3 mt-2">
                        <Link href={`/dashboard/projects/${projectId}/digital-ads/new`}>
                          <Button size="sm" className="gap-1">
                            <Plus className="w-4 h-4" />
                            New Campaign
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline" className="gap-1" onClick={openLinkDialog}>
                          <LinkIcon className="w-4 h-4" />
                          Link Existing
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const platform = platformConfig[campaign.platform] || platformConfig.OTHER;
                  return (
                    <TableRow
                      key={campaign.id}
                      className="cursor-pointer hover:bg-muted/50 group"
                      onClick={() => router.push(`/dashboard/projects/${projectId}/digital-ads/${campaign.id}`)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          {campaign.audienceSegment && (
                            <div className="text-xs text-muted-foreground">
                              {campaign.audienceSegment}
                            </div>
                          )}
                          {campaign.syncStatus && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                campaign.syncStatus === 'synced' ? 'bg-green-500' :
                                campaign.syncStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                              }`} />
                              Last synced: {campaign.lastSyncedAt ? new Date(campaign.lastSyncedAt).toLocaleDateString() : 'Never'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span style={{ color: platform.color }}>
                            {platform.icon}
                          </span>
                          <span className="text-sm">{platform.label}</span>
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
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span>
                            {campaign.metrics?.spend?.toLocaleString() || '0'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <EyeIcon className="w-3 h-3 text-muted-foreground" />
                          <span>
                            {campaign.metrics?.impressions?.toLocaleString() || '0'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3 text-muted-foreground" />
                          <span>
                            {campaign.metrics?.clicks?.toLocaleString() || '0'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={
                          campaign.metrics?.ctr && campaign.metrics.ctr >= 2
                            ? 'text-green-600 dark:text-green-400'
                            : campaign.metrics?.ctr && campaign.metrics.ctr < 1
                            ? 'text-red-600 dark:text-red-400'
                            : ''
                        }>
                          {campaign.metrics?.ctr?.toFixed(2) || '0.00'}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={
                          campaign.metrics?.roas && campaign.metrics.roas >= 2
                            ? 'text-green-600 dark:text-green-400'
                            : campaign.metrics?.roas && campaign.metrics.roas < 1
                            ? 'text-red-600 dark:text-red-400'
                            : ''
                        }>
                          {campaign.metrics?.roas?.toFixed(2) || '0.00'}x
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleSync(campaign.id)}
                            disabled={isSyncing === campaign.id}
                          >
                            {isSyncing === campaign.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
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
                                <Link href={`/dashboard/projects/${projectId}/digital-ads/${campaign.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/projects/${projectId}/digital-ads/${campaign.id}/edit`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/projects/${projectId}/digital-ads/${campaign.id}/metrics`}>
                                  <BarChart3 className="w-4 h-4 mr-2" />
                                  View Metrics
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSync(campaign.id)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Sync Now
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'DRAFT')}>
                                <Clock className="w-4 h-4 mr-2" />
                                Draft
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
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Completed
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Link Campaign Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Existing Digital Ad Campaign</DialogTitle>
            <DialogDescription>
              Select a campaign to link to this project. Only campaigns not already linked to this project will be shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns by name or platform..."
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
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No available campaigns found</p>
                <p className="text-sm mt-1">
                  All campaigns may already be linked to this project.
                  <br />
                  <Link href={`/dashboard/projects/${projectId}/digital-ads/new`} 
                        className="text-primary hover:underline">
                    Create a new campaign instead
                  </Link>
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableCampaigns.map((campaign) => {
                  const platform = platformConfig[campaign.platform] || platformConfig.OTHER;
                  return (
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
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span style={{ color: platform.color }}>{platform.icon}</span>
                              <span>{platform.label}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>{campaign.currency} {campaign.budget.toLocaleString()}</span>
                            <span>•</span>
                            <span>{campaign._count?.metrics || 0} data points</span>
                          </div>
                        </div>
                        <Badge className={statusColors[campaign.status]}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
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

export default DigitalAdsTab;