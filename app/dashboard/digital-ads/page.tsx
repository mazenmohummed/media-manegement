// app/dashboard/digital-ads/page.tsx
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Link from 'next/link';
import {
  Plus,
  BarChart3,
  DollarSign,
  Target,
  Eye,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Clock,
  Megaphone,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DigitalCampaignStatus, AdPlatform } from '@prisma/client';
import { DigitalAdsFilters } from '@/components/digital-ads/DigitalAdsFilters';

interface PageProps {
  searchParams: Promise<{
    status?: DigitalCampaignStatus;
    platform?: AdPlatform;
    search?: string;
  }>;
}

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

const platformLabels: Record<string, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  GOOGLE: 'Google Ads',
  YOUTUBE: 'YouTube',
  SNAPCHAT: 'Snapchat',
  X: 'X (Twitter)',
  LINKEDIN: 'LinkedIn',
  OTHER: 'Other',
};

export default async function DigitalAdsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;
  const { status, platform, search } = await searchParams;

  const where: any = {
    agencyId,
    deletedAt: null,
  };

  if (status) where.status = status;
  if (platform) where.platform = platform;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { audienceSegment: { contains: search, mode: 'insensitive' } },
    ];
  }

  const campaigns = await db.digitalAdCampaign.findMany({
    where,
    include: {
      project: {
        select: { id: true, name: true, projectNo: true },
      },
      campaign: {
        select: { id: true, name: true, campaignNo: true },
      },
      metrics: {
        orderBy: { date: 'desc' },
        take: 1,
      },
      _count: {
        select: { metrics: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate stats
  const totalSpend = campaigns.reduce(
    (sum, c) => sum + (c.metrics[0]?.spend || 0),
    0
  );
  const totalImpressions = campaigns.reduce(
    (sum, c) => sum + (c.metrics[0]?.impressions || 0),
    0
  );
  const totalClicks = campaigns.reduce(
    (sum, c) => sum + (c.metrics[0]?.clicks || 0),
    0
  );
  const totalConversions = campaigns.reduce(
    (sum, c) => sum + (c.metrics[0]?.conversions || 0),
    0
  );
  const avgCTR =
    totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Digital Ads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all digital ad campaigns across your projects
          </p>
        </div>
        <Link href="/dashboard/digital-ads/new">
          <Button className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Ad Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              EGP {totalSpend.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-blue-500" /> Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalImpressions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {totalClicks.toLocaleString()} clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-purple-500" /> Avg. CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgCTR.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">
              {totalConversions.toLocaleString()} conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Megaphone className="w-3.5 h-3.5 text-orange-500" /> Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground">
              {campaigns.filter((c) => c.status === 'ACTIVE').length} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Client Component */}
      <DigitalAdsFilters
        initialSearch={search || ''}
        initialStatus={status || ''}
        initialPlatform={platform || ''}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>ROAS</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <BarChart3 className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-lg font-medium">No digital ad campaigns found</p>
                      <p className="text-sm max-w-md">
                        {search || status || platform
                          ? 'Try adjusting your filters'
                          : 'Create your first digital ad campaign to get started'}
                      </p>
                      <Link href="/dashboard/digital-ads/new">
                        <Button size="sm" className="gap-1 mt-2">
                          <Plus className="w-4 h-4" />
                          Create Campaign
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => {
                  const metric = campaign.metrics[0];
                  return (
                    <TableRow key={campaign.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link
                          href={`/dashboard/digital-ads/${campaign.id}`}
                          className="block"
                        >
                          <div className="font-medium">{campaign.name}</div>
                          {campaign.audienceSegment && (
                            <div className="text-xs text-muted-foreground">
                              {campaign.audienceSegment}
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {campaign.project ? (
                          <Link
                            href={`/dashboard/projects/${campaign.project.id}`}
                            className="text-sm hover:underline flex items-center gap-1"
                          >
                            <FolderOpen className="w-3 h-3 text-muted-foreground" />
                            {campaign.project.name}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {platformLabels[campaign.platform] || campaign.platform}
                        </span>
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
                        {metric
                          ? `${campaign.currency} ${metric.spend.toLocaleString()}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            metric?.ctr && metric.ctr >= 2
                              ? 'text-green-600 dark:text-green-400'
                              : metric?.ctr && metric.ctr < 1
                              ? 'text-red-600 dark:text-red-400'
                              : ''
                          }
                        >
                          {metric?.ctr ? `${metric.ctr.toFixed(2)}%` : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            metric?.roas && metric.roas >= 2
                              ? 'text-green-600 dark:text-green-400'
                              : metric?.roas && metric.roas < 1
                              ? 'text-red-600 dark:text-red-400'
                              : ''
                          }
                        >
                          {metric?.roas ? `${metric.roas.toFixed(2)}x` : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/digital-ads/${campaign.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <ExternalLink className="w-3.5 h-3.5" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}