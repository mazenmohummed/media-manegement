// components/campaigns/CampaignsPageClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Clock,
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

interface Campaign {
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

interface Client {
  id: string;
  clientName: string;
  clientNo: string | null;
}

interface CampaignsPageClientProps {
  initialCampaigns: Campaign[];
  initialClients: Client[];
  initialStats: {
    _count: { id: number };
    _sum: { budget: number | null };
  };
}

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

export function CampaignsPageClient({
  initialCampaigns,
  initialClients,
  initialStats,
}: CampaignsPageClientProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedClient, setSelectedClient] = useState<string>('ALL');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter campaigns based on search and filters
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

    return filtered;
  }, [campaigns, search, selectedStatus, selectedClient]);

  // Stats calculations
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const completedCampaigns = campaigns.filter((c) => c.status === 'COMPLETED').length;

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
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground">All campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCampaigns}</p>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{completedCampaigns}</p>
            <p className="text-xs text-muted-foreground">Completed campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${totalBudget.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Combined budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="PLANNED">Planned</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          <option value="ALL">All Clients</option>
          {initialClients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.clientName}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setSearch('');
            setSelectedStatus('ALL');
            setSelectedClient('ALL');
          }}
        >
          Clear Filters
        </Button>
      </div>

      {/* Campaigns Table */}
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
                    No campaigns found. Create your first campaign!
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          <Link
                            href={`/dashboard/campaigns/${campaign.id}`}
                            className="hover:underline"
                          >
                            {campaign.name}
                          </Link>
                        </div>
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
                    <TableCell className="text-right">
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
    </div>
  );
}