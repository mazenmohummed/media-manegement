// app/dashboard/projects/[projectId]/digital-ads/[adId]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { TableBody, TableCell, TableHead, TableRow, TableHeader, Table } from '@/components/ui/table';
import { CopyButton } from '@/components/ui/copy-button';

interface DigitalAdPageProps {
  // ✅ Promise-based params
  params: Promise<{
    projectId: string;  // ✅ Correct param name
    adId: string;
  }>;
}

export default async function DigitalAdPage({ params }: DigitalAdPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;
  if (!agencyId) {
    redirect('/onboarding');
  }

  // ✅ Await params
  const { projectId, adId } = await params;

  // ✅ Validate
  if (!projectId || !adId) {
    notFound();
  }

  // ✅ Use findFirst instead of findUnique (agencyId filter)
  const adCampaign = await prisma.digitalAdCampaign.findFirst({
    where: {
      id: adId,
      projectId: projectId,
      agencyId: agencyId,
      deletedAt: null,
    },
    include: {
      project: {
        include: {
          client: {
            select: {
              id: true,
              clientName: true,
            },
          },
        },
      },
      campaign: {
        select: {
          id: true,
          name: true,
        },
      },
      metrics: {
        orderBy: {
          date: 'desc',
        },
        take: 30,
      },
    },
  });

  if (!adCampaign) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        {/* ✅ Fixed path */}
        <Link href={`/dashboard/projects/${projectId}/digital-ads`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold flex-1">{adCampaign.name}</h1>
        <Link href={`/dashboard/projects/${projectId}/digital-ads/${adId}/metrics`}>
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Metrics
          </Button>
        </Link>
        <Link href={`/dashboard/projects/${projectId}/digital-ads/${adId}/edit`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {/* ... rest of the component stays the same, just replace params.id with projectId and params.adId with adId */}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{adCampaign.platform}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {adCampaign.currency} {adCampaign.budget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[adCampaign.status]}>
              {adCampaign.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>UTM Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {adCampaign.utmSource && (
              <div>
                <span className="text-sm font-medium">Source:</span>
                <span className="ml-2 text-sm">{adCampaign.utmSource}</span>
              </div>
            )}
            {adCampaign.utmMedium && (
              <div>
                <span className="text-sm font-medium">Medium:</span>
                <span className="ml-2 text-sm">{adCampaign.utmMedium}</span>
              </div>
            )}
            {adCampaign.utmCampaign && (
              <div>
                <span className="text-sm font-medium">Campaign:</span>
                <span className="ml-2 text-sm">{adCampaign.utmCampaign}</span>
              </div>
            )}
            {adCampaign.utmTerm && (
              <div>
                <span className="text-sm font-medium">Term:</span>
                <span className="ml-2 text-sm">{adCampaign.utmTerm}</span>
              </div>
            )}
            {adCampaign.utmContent && (
              <div>
                <span className="text-sm font-medium">Content:</span>
                <span className="ml-2 text-sm">{adCampaign.utmContent}</span>
              </div>
            )}
            {adCampaign.landingPageUrl && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Landing Page:</span>
                    <p className="text-sm text-muted-foreground break-all mt-1">
                      {adCampaign.landingPageUrl}
                    </p>
                  </div>
                  <CopyButton text={adCampaign.landingPageUrl} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracking & Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {adCampaign.pixelId && (
              <div>
                <span className="text-sm font-medium">Pixel ID:</span>
                <span className="ml-2 text-sm font-mono">{adCampaign.pixelId}</span>
              </div>
            )}
            {adCampaign.audienceSegment && (
              <div>
                <span className="text-sm font-medium">Audience Segment:</span>
                <span className="ml-2 text-sm">{adCampaign.audienceSegment}</span>
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm">
                <div>Created: {format(new Date(adCampaign.createdAt), 'PPP')}</div>
                {adCampaign.startDate && (
                  <div>Start Date: {format(new Date(adCampaign.startDate), 'PPP')}</div>
                )}
                {adCampaign.endDate && (
                  <div>End Date: {format(new Date(adCampaign.endDate), 'PPP')}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {adCampaign.metrics.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Performance Metrics</CardTitle>
              <Link href={`/dashboard/projects/${projectId}/digital-ads/${adId}/metrics`}>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View All Metrics
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reach</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>Spend</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adCampaign.metrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell>{format(new Date(metric.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{metric.reach.toLocaleString()}</TableCell>
                      <TableCell>{metric.impressions.toLocaleString()}</TableCell>
                      <TableCell>{metric.clicks.toLocaleString()}</TableCell>
                      <TableCell>{(metric.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell>{adCampaign.currency} {metric.spend.toLocaleString()}</TableCell>
                      <TableCell>{metric.conversions.toLocaleString()}</TableCell>
                      <TableCell>{adCampaign.currency} {metric.revenue.toLocaleString()}</TableCell>
                      <TableCell>{metric.roas.toFixed(2)}x</TableCell>
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