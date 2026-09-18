// components/campaigns/CampaignTabs.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart3, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Plus, 
  Eye,
  TrendingUp,
  Smartphone
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CampaignTabsProps {
  campaignId: string;
}

interface Project {
  id: string;
  name: string;
  projectNo?: string;
  status: string;
  totalValue: number;
  currency: string;
  targetDeadline?: Date;
  createdAt: Date;
  digitalAdCampaigns: {
    id: string;
    name: string;
    platform: string;
    status: string;
    budget: number;
  }[];
  _count?: {
    tasks: number;
    milestones: number;
  };
}

interface CampaignStats {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  activeProjects: number;
  totalProjects: number;
  activeAds: number;
  totalAds: number;
}

export function CampaignTabs({ campaignId }: CampaignTabsProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [projectsRes, statsRes] = await Promise.all([
          fetch(`/api/campaigns/${campaignId}/projects`),
          fetch(`/api/campaigns/${campaignId}/digital-ads/stats`),
        ]);

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data.projects || []);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching campaign data:', error);
        toast.error('Failed to load campaign data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [campaignId]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      ACTIVE: 'bg-green-100 text-green-800',
      ON_HOLD: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
      PLANNED: 'bg-blue-100 text-blue-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading campaign data...</div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="ads">Ad Campaigns</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats?.totalBudget ? `${stats.totalBudget.toLocaleString()}` : '0'}
              </p>
              <p className="text-xs text-muted-foreground">Campaign budget</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalProjects || 0}</p>
              <p className="text-xs text-muted-foreground">
                {stats?.activeProjects || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ad Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalAds || 0}</p>
              <p className="text-xs text-muted-foreground">
                {stats?.activeAds || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats?.totalRevenue ? `${stats.totalRevenue.toLocaleString()}` : '0'}
              </p>
              <p className="text-xs text-muted-foreground">Total revenue</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Recent Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No projects yet. Create your first project for this campaign.
              </p>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.projectNo && `#${project.projectNo}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {project.currency} {project.totalValue.toLocaleString()}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="projects">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                All Projects
              </CardTitle>
              <Link href={`/projects/new?campaignId=${campaignId}`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No projects found for this campaign.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Ad Campaigns</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {project.projectNo && `#${project.projectNo}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {project.currency} {project.totalValue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                            <span>{project.digitalAdCampaigns?.length || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.targetDeadline ? (
                            format(new Date(project.targetDeadline), 'MMM d, yyyy')
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/projects/${project.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ads">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Digital Ad Campaigns
              </CardTitle>
              <Link href={`/projects?campaignId=${campaignId}`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Ad Campaign
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Ad campaigns are created within projects. 
              <br />
              Navigate to a project to create or manage its ad campaigns.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => router.push(`/campaigns/${campaignId}/projects`)}>
                <Briefcase className="w-4 h-4 mr-2" />
                View Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}