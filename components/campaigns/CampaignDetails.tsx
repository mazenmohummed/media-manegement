// components/campaigns/CampaignDetails.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Edit, 
  Trash2, 
  Plus,
  Loader2,
  FolderOpen,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Clock,
  Link as LinkIcon,
  ExternalLink,
  Search,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  campaignNo?: string | null;
  name: string;
  objective?: string | null;
  budget: number;
  currency: string;
  status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startDate: Date;
  endDate?: Date | null;
  createdAt: Date;
  client: {
    id: string;
    clientName: string;
    clientNo?: string | null;
  };
  agency: {
    id: string;
    agencyName: string;
  };
  projects: any[];
  _count?: {
    projects: number;
    digitalAdCampaigns: number;
  };
}

interface Project {
  id: string;
  name: string;
  projectNo: string;
  status: string;
  totalValue: number;
  currency: string;
  client: {
    id: string;
    clientName: string;
  };
  _count: {
    tasks: number;
    milestones: number;
  };
}

interface CampaignDetailsProps {
  campaign: Campaign;
  onEdit?: () => void;
  onDelete?: () => void;
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
  PLANNED: <Clock className="w-4 h-4" />,
  ACTIVE: <PlayCircle className="w-4 h-4" />,
  PAUSED: <PauseCircle className="w-4 h-4" />,
  COMPLETED: <CheckCircle className="w-4 h-4" />,
  CANCELLED: <XCircle className="w-4 h-4" />,
};

const projectStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
};

// ─── Main Component ────────────────────────────────────────────────────

export function CampaignDetails({ campaign, onEdit, onDelete }: CampaignDetailsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  
  // ─── Link Project States ─────────────────────────────────────────────
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // ─── Fetch Projects ──────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'projects') {
      fetchProjects();
    }
  }, [campaign.id, activeTab]);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/projects`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // ─── Fetch Available Projects ────────────────────────────────────────

  const fetchAvailableProjects = async () => {
    setIsLoadingAvailable(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('excludeCampaignId', campaign.id);
      
      const response = await fetch(`/api/projects/available?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch available projects');
      const data = await response.json();
      setAvailableProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching available projects:', error);
      toast.error('Failed to load available projects');
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  // ─── Open Link Dialog ────────────────────────────────────────────────

  const openLinkDialog = () => {
    setIsLinkDialogOpen(true);
    setSearchQuery('');
    setSelectedProjectId(null);
    fetchAvailableProjects();
  };

  // ─── Link Project ────────────────────────────────────────────────────

  const handleLinkProject = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project to link');
      return;
    }

    setIsLinking(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/projects/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link project');
      }

      toast.success('Project linked successfully');
      setIsLinkDialogOpen(false);
      await fetchProjects();
      router.refresh();
    } catch (error) {
      console.error('Error linking project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link project');
    } finally {
      setIsLinking(false);
    }
  };

  // ─── Unlink Project ──────────────────────────────────────────────────

  const handleUnlinkProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to unlink this project from the campaign?')) return;

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/projects/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlink project');
      }

      toast.success('Project unlinked successfully');
      await fetchProjects();
      router.refresh();
    } catch (error) {
      console.error('Error unlinking project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unlink project');
    }
  };

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete campaign');
      }

      toast.success('Campaign deleted successfully');
      router.push('/dashboard/campaigns');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete campaign');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const projectCount = campaign.projects?.length || campaign._count?.projects || 0;
  const adCount = campaign._count?.digitalAdCampaigns || 0;

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ─── Header Section ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <Badge className={statusColors[campaign.status]}>
              <span className="flex items-center gap-1">
                {statusIcons[campaign.status]}
                {campaign.status}
              </span>
            </Badge>
          </div>
          
          {campaign.campaignNo && (
            <p className="text-sm text-muted-foreground mt-1">
              Campaign #{campaign.campaignNo}
            </p>
          )}
          
          {campaign.objective && (
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {campaign.objective}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {campaign.client.clientName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(campaign.startDate), 'MMM d, yyyy')}
              {campaign.endDate && ` - ${format(new Date(campaign.endDate), 'MMM d, yyyy')}`}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {campaign.currency} {campaign.budget.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {/* Create Project Button */}
          <Link href={`/dashboard/projects/new?campaignId=${campaign.id}`}>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </Link>

          {/* Link Existing Project Button */}
          <Button size="sm" variant="outline" className="gap-1" onClick={openLinkDialog}>
            <LinkIcon className="w-4 h-4" />
            Link Project
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleStatusChange('PLANNED')}>
                <Clock className="w-4 h-4 mr-2" />
                Planned
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('ACTIVE')}>
                <PlayCircle className="w-4 h-4 mr-2" />
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('PAUSED')}>
                <PauseCircle className="w-4 h-4 mr-2" />
                Paused
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('COMPLETED')}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('CANCELLED')}>
                <XCircle className="w-4 h-4 mr-2" />
                Cancelled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={onEdit || (() => router.push(`/dashboard/campaigns/${campaign.id}/edit`))}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {campaign.currency} {campaign.budget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{projectCount}</p>
            <p className="text-xs text-muted-foreground">Total projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ad Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{adCount}</p>
            <p className="text-xs text-muted-foreground">Digital ad campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[campaign.status]}>
              {campaign.status}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Created {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Tabs Section ────────────────────────────────────────────── */}
      <Tabs defaultValue="projects" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="ads">Ad Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Linked Projects</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={openLinkDialog}>
                <LinkIcon className="w-4 h-4" />
                Link Existing
              </Button>
              <Link href={`/dashboard/projects/new?campaignId=${campaign.id}`}>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
              </Link>
            </div>
          </div>
          
          {isLoadingProjects ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No projects linked yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a new project or link an existing one
                </p>
                <div className="flex gap-3 mt-4">
                  <Link href={`/dashboard/projects/new?campaignId=${campaign.id}`}>
                    <Button size="sm" className="gap-1">
                      <Plus className="w-4 h-4" />
                      New Project
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" className="gap-1" onClick={openLinkDialog}>
                    <LinkIcon className="w-4 h-4" />
                    Link Existing
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className="p-4 border rounded-lg hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{project.name}</h4>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{project.projectNo}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{project.client.clientName}</span>
                        <span>•</span>
                        <span>{project.currency} {project.totalValue.toLocaleString()}</span>
                        <span>•</span>
                        <span>{project._count.tasks} tasks</span>
                        <span>•</span>
                        <span>{project._count.milestones} milestones</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={projectStatusColors[project.status]}>
                        {project.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600"
                        onClick={() => handleUnlinkProject(project.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Ad Campaigns Tab */}
        <TabsContent value="ads" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Ad Campaigns</h3>
            <Link href={`/dashboard/ads/new?campaignId=${campaign.id}`}>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Create Ad Campaign
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No ad campaigns yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first ad campaign for this campaign
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <h3 className="text-lg font-semibold mb-4">Campaign Analytics</h3>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Analytics coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Link Project Dialog ────────────────────────────────────── */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Existing Project</DialogTitle>
            <DialogDescription>
              Select a project to link to this campaign. Only projects not already linked to a campaign will be shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects by name or number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchAvailableProjects();
                }}
                className="pl-9"
              />
            </div>

            {isLoadingAvailable ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No available projects found</p>
                <p className="text-sm mt-1">
                  All projects may already be linked to campaigns.
                  <br />
                  <Link href={`/dashboard/projects/new?campaignId=${campaign.id}`} className="text-primary hover:underline">
                    Create a new project instead
                  </Link>
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProjectId === project.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50 hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{project.name}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{project.projectNo}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{project.client.clientName}</span>
                          <span>•</span>
                          <span>{project.currency} {project.totalValue.toLocaleString()}</span>
                          <span>•</span>
                          <span>{project._count.tasks} tasks</span>
                        </div>
                      </div>
                      <Badge className={projectStatusColors[project.status]}>
                        {project.status}
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
              onClick={handleLinkProject} 
              disabled={!selectedProjectId || isLinking}
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
                  Link Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}