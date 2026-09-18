// components/campaigns/CampaignHealthDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface HealthStatus {
  campaignId: string;
  campaignName: string;
  platform: string;
  status: 'green' | 'amber' | 'red';
  metrics: {
    ctr: number;
    roas: number;
    cpc: number;
    reach: number;
    conversions: number;
    spend: number;
  };
  thresholds: {
    minCTR?: number;
    minROAS?: number;
    maxCPC?: number;
    minReach?: number;
    minConversions?: number;
  };
  breaches: string[];
  optimizationTaskOpen: boolean;
}

interface HealthDashboardData {
  summary: {
    total: number;
    green: number;
    amber: number;
    red: number;
    needsAttention: number;
  };
  campaigns: HealthStatus[];
}

export function CampaignHealthDashboard() {
  const router = useRouter();
  const [data, setData] = useState<HealthDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<HealthStatus | null>(null);
  const [thresholds, setThresholds] = useState<any>(null);
  const [isThresholdDialogOpen, setIsThresholdDialogOpen] = useState(false);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/campaigns/health');
      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching health data:', error);
      toast.error('Failed to load campaign health data');
    } finally {
      setIsLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/campaigns/health/check', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to run health check');
      }
      const result = await response.json();
      toast.success(`Health check complete. ${result.tasksCreated} tasks created, ${result.tasksUpdated} updated.`);
      await fetchHealthData();
    } catch (error) {
      console.error('Error running health check:', error);
      toast.error('Failed to run health check');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'amber':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'red':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'green':
        return 'Healthy';
      case 'amber':
        return 'Warning';
      case 'red':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green':
        return 'bg-green-100 text-green-800';
      case 'amber':
        return 'bg-yellow-100 text-yellow-800';
      case 'red':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMetricTrend = (value: number, threshold: number, isLowerBetter: boolean = false) => {
    if (!threshold) return <Minus className="w-4 h-4 text-gray-400" />;
    const isGood = isLowerBetter ? value <= threshold : value >= threshold;
    return isGood ? 
      <TrendingUp className="w-4 h-4 text-green-500" /> : 
      <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Campaigns</h3>
          <p className="text-muted-foreground">
            No active ad campaigns found. Campaigns will appear here once they have metrics data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.summary.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{data.summary.green}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{data.summary.amber}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{data.summary.red}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{data.summary.needsAttention}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={runHealthCheck} disabled={isChecking}>
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Health Check
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => router.push('/settings/campaign-health')}>
            <Settings className="w-4 h-4 mr-2" />
            Thresholds
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
        </span>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>ROAS</TableHead>
                  <TableHead>CPC</TableHead>
                  <TableHead>Reach</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.campaigns.map((campaign) => (
                  <TableRow key={campaign.campaignId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{campaign.campaignName}</div>
                        <div className="text-xs text-muted-foreground">{campaign.platform}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(campaign.status)}
                        <Badge className={getStatusColor(campaign.status)}>
                          {getStatusLabel(campaign.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {campaign.metrics.ctr.toFixed(2)}%
                        {getMetricTrend(campaign.metrics.ctr, campaign.thresholds.minCTR || 0)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {campaign.metrics.roas.toFixed(2)}x
                        {getMetricTrend(campaign.metrics.roas, campaign.thresholds.minROAS || 0)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        ${campaign.metrics.cpc.toFixed(2)}
                        {getMetricTrend(campaign.metrics.cpc, campaign.thresholds.maxCPC || 0, true)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {campaign.metrics.reach.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {campaign.metrics.conversions}
                    </TableCell>
                    <TableCell>
                      {campaign.breaches.length > 0 ? (
                        <Badge variant="destructive">
                          {campaign.breaches.length} {campaign.breaches.length === 1 ? 'issue' : 'issues'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No issues</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/projects/${campaign.campaignId}/digital-ads/${campaign.campaignId}`)}
                      >
                        View
                      </Button>
                      {campaign.optimizationTaskOpen && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/tasks')}
                        >
                          Task
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Threshold Dialog */}
      <Dialog open={isThresholdDialogOpen} onOpenChange={setIsThresholdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Health Thresholds</DialogTitle>
            <DialogDescription>
              Configure the thresholds for campaign health monitoring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="minCTR">Minimum CTR (%)</Label>
              <Input
                id="minCTR"
                type="number"
                step="0.1"
                placeholder="1.5"
                defaultValue={1.5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minROAS">Minimum ROAS (x)</Label>
              <Input
                id="minROAS"
                type="number"
                step="0.1"
                placeholder="2.0"
                defaultValue={2.0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxCPC">Maximum CPC ($)</Label>
              <Input
                id="maxCPC"
                type="number"
                step="0.01"
                placeholder="5.00"
                defaultValue={5.0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minReach">Minimum Daily Reach</Label>
              <Input
                id="minReach"
                type="number"
                placeholder="1000"
                defaultValue={1000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minConversions">Minimum Daily Conversions</Label>
              <Input
                id="minConversions"
                type="number"
                placeholder="10"
                defaultValue={10}
              />
            </div>
            <Button className="w-full" onClick={() => setIsThresholdDialogOpen(false)}>
              Save Thresholds
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}