// app/dashboard/campaigns/[campaignId]/projects/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  DollarSign,
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Link as LinkIcon,
  Unlink,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectStatus } from "@prisma/client";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  campaignNo: string | null;
  status: string;
  client: {
    id: string;
    clientName: string;
    clientNo: string | null;
  };
  _count: {
    projects: number;
  };
}

interface Project {
  id: string;
  name: string;
  projectNo: string;
  status: ProjectStatus;
  totalValue: number;
  currency: string;
  client: {
    id: string;
    clientName: string;
    clientNo: string | null;
  };
  contract: {
    id: string;
    contractNo: string;
    name: string;
  } | null;
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
  _count: {
    tasks: number;
    milestones: number;
    attachments: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────

const projectStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  ON_HOLD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  ARCHIVED: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
};

const projectStatusIcons: Record<string, React.ReactNode> = {
  DRAFT: <AlertCircle className="w-3 h-3" />,
  ACTIVE: <CheckCircle2 className="w-3 h-3" />,
  ON_HOLD: <Clock className="w-3 h-3" />,
  COMPLETED: <CheckCircle2 className="w-3 h-3" />,
  CANCELLED: <AlertCircle className="w-3 h-3" />,
  ARCHIVED: <Clock className="w-3 h-3" />,
};

const statusOptions = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ARCHIVED", label: "Archived" },
];

// ─── Main Component ────────────────────────────────────────────────────

export default function CampaignProjectsPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.campaignId as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [hasFilters, setHasFilters] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────────────────

  useEffect(() => {
    if (campaignId) {
      fetchData();
    }
  }, [campaignId, selectedStatus, searchQuery]);

  const fetchData = async () => {
    if (!campaignId) return;

    setIsLoading(true);
    try {
      // Fetch campaign details
      const campaignRes = await fetch(`/api/campaigns/${campaignId}`);
      if (!campaignRes.ok) throw new Error('Failed to fetch campaign');
      const campaignData = await campaignRes.json();
      setCampaign(campaignData.campaign);

      // Build query params
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.append('status', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);

      // Fetch projects
      const projectsRes = await fetch(`/api/campaigns/${campaignId}/projects?${params.toString()}`);
      if (!projectsRes.ok) throw new Error('Failed to fetch projects');
      const projectsData = await projectsRes.json();
      setProjects(projectsData.projects || []);

      // Fetch available projects
      const availableRes = await fetch(`/api/campaigns/${campaignId}/projects/available`);
      if (availableRes.ok) {
        const availableData = await availableRes.json();
        setAvailableProjects(availableData.projects || []);
      }

      setHasFilters(!!(searchQuery || selectedStatus !== "ALL"));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedStatus(value);
    const params = new URLSearchParams(window.location.search);
    if (value !== "ALL") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    if (searchQuery) {
      params.set("search", searchQuery);
    }
    router.push(`/dashboard/campaigns/${campaignId}/projects?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (selectedStatus !== "ALL") params.set("status", selectedStatus);
    router.push(`/dashboard/campaigns/${campaignId}/projects?${params.toString()}`);
  };

  const handleUnlink = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to unlink "${projectName}" from this campaign?`)) return;

    setIsUnlinking(projectId);
    try {
      const response = await fetch(`/api/projects/${projectId}/unlink-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlink project');
      }

      toast.success('Project unlinked successfully');
      await fetchData();
    } catch (error) {
      console.error('Error unlinking project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unlink project');
    } finally {
      setIsUnlinking(null);
    }
  };

  const handleLinkProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/projects/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link project');
      }

      toast.success('Project linked successfully');
      await fetchData();
    } catch (error) {
      console.error('Error linking project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link project');
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("ALL");
    setHasFilters(false);
    router.push(`/dashboard/campaigns/${campaignId}/projects`);
  };

  // ─── Calculate Stats ─────────────────────────────────────────────────

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const totalValue = projects.reduce((sum, p) => sum + p.totalValue, 0);

  // ─── Loading State ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Campaign not found</h2>
          <Link href="/dashboard/campaigns" className="text-primary hover:underline mt-4 inline-block">
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/campaigns/${campaignId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campaign
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/projects/new?campaignId=${campaignId}`}>
            <Button className="gap-1">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </Link>
          <Link href={`/dashboard/campaigns/${campaignId}/projects/link`}>
            <Button variant="outline" className="gap-1">
              <LinkIcon className="w-4 h-4" />
              Link Existing
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Campaign Info ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent rounded-xl border p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>Campaign #{campaign.campaignNo}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {campaign.client.clientName}
              </span>
              <span>•</span>
              <Badge variant="outline">{campaign.status}</Badge>
              <span>•</span>
              <span>{campaign._count.projects} projects</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {totalProjects} Projects
            </Badge>
          </div>
        </div>
      </div>

      {/* ─── Stats Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalProjects}</p>
            <p className="text-xs text-muted-foreground">Linked to campaign</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activeProjects}
            </p>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {completedProjects}
            </p>
            <p className="text-xs text-muted-foreground">Completed projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${totalValue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Combined project value</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, number, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </form>
        <select
          value={selectedStatus}
          onChange={handleStatusChange}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* ─── Projects Table ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Milestones</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <Briefcase className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-lg font-medium">No projects found</p>
                      <p className="text-sm max-w-md">
                        {hasFilters
                          ? "Try adjusting your filters"
                          : "This campaign doesn't have any projects yet"}
                      </p>
                      <div className="flex gap-3 mt-2">
                        <Link href={`/dashboard/projects/new?campaignId=${campaignId}`}>
                          <Button size="sm" className="gap-1">
                            <Plus className="w-4 h-4" />
                            Create Project
                          </Button>
                        </Link>
                        <Link href={`/dashboard/campaigns/${campaignId}/projects/link`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <LinkIcon className="w-4 h-4" />
                            Link Existing
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50 group"
                  >
                    <TableCell>
                      <Link href={`/dashboard/projects/${project.id}`} className="block">
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>{project.projectNo}</span>
                            {project.tags.length > 0 && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  {project.tags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                                      style={{
                                        backgroundColor: `${tag.color}25`,
                                        color: tag.color,
                                        border: `1px solid ${tag.color}40`,
                                      }}
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: tag.color }}
                                      />
                                      {tag.name}
                                    </span>
                                  ))}
                                  {project.tags.length > 2 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{project.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/projects/${project.id}`} className="block">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{project.client.clientName}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/projects/${project.id}`} className="block">
                        <Badge className={projectStatusColors[project.status]}>
                          <span className="flex items-center gap-1">
                            {projectStatusIcons[project.status]}
                            {project.status}
                          </span>
                        </Badge>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/projects/${project.id}`} className="block">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span>
                            {project.currency} {project.totalValue.toLocaleString()}
                          </span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/projects/${project.id}`} className="block">
                        <Badge variant="outline">{project._count.tasks}</Badge>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/projects/${project.id}`} className="block">
                        <Badge variant="outline">{project._count.milestones}</Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
                              <Link href={`/dashboard/projects/${project.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/projects/${project.id}/edit`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleUnlink(project.id, project.name)}
                              disabled={isUnlinking === project.id}
                            >
                              {isUnlinking === project.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Unlink className="w-4 h-4 mr-2" />
                              )}
                              {isUnlinking === project.id ? 'Unlinking...' : 'Unlink from Campaign'}
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

      {/* ─── Available Projects to Link ──────────────────────────────── */}
      {availableProjects.length > 0 && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              Available Projects to Link
            </CardTitle>
            <CardDescription>
              These projects are not yet linked to any campaign and belong to the same client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableProjects.slice(0, 6).map((project) => (
                <div
                  key={project.id}
                  className="p-3 border rounded-lg bg-background hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.projectNo}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{project.client.clientName}</span>
                        <span>•</span>
                        <span>{project.currency} {project.totalValue.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80"
                      onClick={() => handleLinkProject(project.id)}
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {availableProjects.length > 6 && (
                <div className="flex items-center justify-center p-3 border rounded-lg bg-background">
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/projects/link`}
                    className="text-sm text-primary hover:underline"
                  >
                    View all {availableProjects.length} available projects
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}