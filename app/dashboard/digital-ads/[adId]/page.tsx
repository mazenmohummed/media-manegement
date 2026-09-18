// app/dashboard/digital-ads/[adId]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, ExternalLink, BarChart3, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
  Table,
} from '@/components/ui/table';
import { CopyButton } from '@/components/ui/copy-button';

interface DigitalAdPageProps {
  params: Promise<{ adId: string }>;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

export default async function DigitalAdDetailPage({ params }: DigitalAdPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;
  const { adId } = await params;

  const adCampaign = await prisma.digitalAdCampaign.findFirst({
    where: {
      id: adId,
      agencyId,
      deletedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          projectNo: true,
          client: { select: { id: true, clientName: true } },
        },
      },
      campaign: {
        select: {
          id: true,
          name: true,
          campaignNo: true,
        },
      },
      metrics: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });

  if (!adCampaign) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <Link
          href="/dashboard/digital-ads"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Digital Ads
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/digital-ads/${adId}/metrics`}>
            <Button variant="outline" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Metrics
            </Button>
          </Link>
          <Link href={`/dashboard/digital-ads/${adId}/edit`}>
            <Button className="gap-1.5">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold">{adCampaign.name}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
          <Badge className={statusColors[adCampaign.status]}>
            {adCampaign.status}
          </Badge>
          <span>·</span>
          <span>{adCampaign.platform}</span>
          {adCampaign.project && (
            <>
              <span>·</span>
              <Link
                href={`/dashboard/projects/${adCampaign.project.id}`}
                className="hover:underline"
              >
                Project: {adCampaign.project.name}
              </Link>
            </>
          )}
          {adCampaign.campaign && (
            <>
              <span>·</span>
              <span>Campaign: {adCampaign.campaign.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {adCampaign.currency} {adCampaign.budget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {adCampaign.currency}{' '}
              {adCampaign.metrics
                .reduce((sum, m) => sum + m.spend, 0)
                .toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {adCampaign.metrics
                .reduce((sum, m) => sum + m.conversions, 0)
                .toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Days Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{adCampaign.metrics.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform:</span>
              <span className="font-medium">{adCampaign.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={statusColors[adCampaign.status]}>
                {adCampaign.status}
              </Badge>
            </div>
            {adCampaign.audienceSegment && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audience:</span>
                <span>{adCampaign.audienceSegment}</span>
              </div>
            )}
            {adCampaign.pixelId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pixel ID:</span>
                <span className="font-mono text-xs">{adCampaign.pixelId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{format(new Date(adCampaign.createdAt), 'MMM d, yyyy')}</span>
            </div>
            {adCampaign.startDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start:</span>
                <span>{format(new Date(adCampaign.startDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            {adCampaign.endDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">End:</span>
                <span>{format(new Date(adCampaign.endDate), 'MMM d, yyyy')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UTM & Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {adCampaign.utmSource && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source:</span>
                <span>{adCampaign.utmSource}</span>
              </div>
            )}
            {adCampaign.utmMedium && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Medium:</span>
                <span>{adCampaign.utmMedium}</span>
              </div>
            )}
            {adCampaign.utmCampaign && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign:</span>
                <span>{adCampaign.utmCampaign}</span>
              </div>
            )}
            {adCampaign.utmTerm && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Term:</span>
                <span>{adCampaign.utmTerm}</span>
              </div>
            )}
            {adCampaign.utmContent && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Content:</span>
                <span>{adCampaign.utmContent}</span>
              </div>
            )}
            {adCampaign.landingPageUrl && (
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-muted-foreground text-xs mb-1">
                      Landing Page:
                    </div>
                    <p className="text-xs break-all">
                      {adCampaign.landingPageUrl}
                    </p>
                  </div>
                  <CopyButton text={adCampaign.landingPageUrl} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Metrics */}
      {adCampaign.metrics.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Metrics</CardTitle>
              <Link href={`/dashboard/digital-ads/${adId}/metrics`}>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>Spend</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adCampaign.metrics.slice(0, 10).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{m.impressions.toLocaleString()}</TableCell>
                      <TableCell>{m.clicks.toLocaleString()}</TableCell>
                      <TableCell>{(m.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell>
                        {adCampaign.currency} {m.spend.toLocaleString()}
                      </TableCell>
                      <TableCell>{m.conversions.toLocaleString()}</TableCell>
                      <TableCell>{m.roas.toFixed(2)}x</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}