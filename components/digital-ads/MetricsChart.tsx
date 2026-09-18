// components/digital-ads/MetricsChart.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays } from 'date-fns';
import { Loader2, TrendingUp, BarChart3, LineChart, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface MetricData {
  date: string;
  reach: number;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  leads: number;
  engagement: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
}

interface MetricsChartProps {
  // ✅ projectId is now optional — component picks the right API based on context
  projectId?: string;
  adId: string;
  adName: string;
  currency?: string;
}

type ChartMetric = 'reach' | 'impressions' | 'clicks' | 'spend' | 'conversions' | 'revenue' | 'leads' | 'engagement' | 'ctr' | 'cpc' | 'cpm' | 'roas';
type ChartType = 'line' | 'bar';

const METRIC_OPTIONS: { value: ChartMetric; label: string }[] = [
  { value: 'reach', label: 'Reach' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'spend', label: 'Spend' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'leads', label: 'Leads' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'ctr', label: 'CTR' },
  { value: 'cpc', label: 'CPC' },
  { value: 'cpm', label: 'CPM' },
  { value: 'roas', label: 'ROAS' },
];

export function MetricsChart({
  projectId,
  adId,
  adName,
  currency = 'USD',
}: MetricsChartProps) {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('reach');
  const [secondaryMetric, setSecondaryMetric] = useState<ChartMetric>('ctr');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchMetrics();
  }, [startDate, endDate]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      params.append('limit', '1000');

      // ✅ Choose API endpoint based on context
      // - If projectId is set → project-scoped API
      // - Otherwise → agency-level API
      const url = projectId
        ? `/api/projects/${projectId}/digital-ads/${adId}/metrics?${params.toString()}`
        : `/api/digital-ads/${adId}/metrics?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      setMetrics(data.metrics || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to load metrics data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatValue = (value: number, metric: ChartMetric) => {
    if (metric === 'spend' || metric === 'revenue') {
      return `${currency} ${value.toFixed(2)}`;
    }
    if (metric === 'ctr') return `${value.toFixed(2)}%`;
    if (metric === 'cpc' || metric === 'cpm') return `${currency} ${value.toFixed(2)}`;
    if (metric === 'roas') return `${value.toFixed(2)}x`;
    return value.toLocaleString();
  };

  const getMetricColor = (metric: ChartMetric): string => {
    const colors: Record<ChartMetric, string> = {
      reach: '#3b82f6',
      impressions: '#8b5cf6',
      clicks: '#10b981',
      spend: '#ef4444',
      conversions: '#f59e0b',
      revenue: '#22c55e',
      leads: '#06b6d4',
      engagement: '#f472b6',
      ctr: '#6366f1',
      cpc: '#f97316',
      cpm: '#ec4899',
      roas: '#14b8a6',
    };
    return colors[metric] || '#3b82f6';
  };

  // This is a simplified chart rendering using divs (in production, you'd use a chart library like recharts)
  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (metrics.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-3">
          <div className="p-3 rounded-full bg-muted/50">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No metrics data available</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Add daily metrics below or import a CSV to see performance trends here
            </p>
          </div>
        </div>
      );
    }

    const maxValue = Math.max(...metrics.map((m) => m[selectedMetric] as number));

    return (
      <div className="space-y-4">
        <div className="relative h-[300px]">
          <div className="absolute inset-0 flex items-end">
            {metrics.map((metric, index) => {
              const value = metric[selectedMetric] as number;
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
              const barWidth = `${100 / metrics.length}%`;

              return (
                <div
                  key={index}
                  className="flex flex-col items-center relative group"
                  style={{ width: barWidth }}
                >
                  <div
                    className="w-[60%] min-w-[4px] rounded-t transition-all duration-300"
                    style={{
                      height: `${Math.max(percentage, 2)}%`,
                      backgroundColor: getMetricColor(selectedMetric),
                    }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-8 text-xs bg-popover px-2 py-1 rounded shadow whitespace-nowrap z-10">
                      {formatValue(value, selectedMetric)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute -bottom-6 left-0 right-0 flex">
            {metrics.map((metric, index) => {
              const displayDate = new Date(metric.date);
              return (
                <div
                  key={index}
                  className="text-center text-[8px] text-muted-foreground"
                  style={{ width: `${100 / metrics.length}%` }}
                >
                  {format(displayDate, 'MM/dd')}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-8 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: getMetricColor(selectedMetric) }}
            />
            <span className="font-medium">{selectedMetric.toUpperCase()}</span>
            <span className="text-muted-foreground">
              {formatValue(
                (metrics[metrics.length - 1]?.[selectedMetric] as number) || 0,
                selectedMetric
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: getMetricColor(secondaryMetric) }}
            />
            <span className="font-medium">{secondaryMetric.toUpperCase()}</span>
            <span className="text-muted-foreground">
              {formatValue(
                (metrics[metrics.length - 1]?.[secondaryMetric] as number) || 0,
                secondaryMetric
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        {/* Row 1: Title */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">
            {adName} - Performance Trends
          </CardTitle>
        </div>

        {/* Row 2: Date Filters + Refresh */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">
              From
            </span>
            <DatePicker
              date={startDate}
              setDate={(date) => {
                if (date) setStartDate(date);
              }}
              placeholder="Start"
              className="w-[160px]"
            />
            <span className="text-xs text-muted-foreground font-medium">
              To
            </span>
            <DatePicker
              date={endDate}
              setDate={(date) => {
                if (date) setEndDate(date);
              }}
              placeholder="End"
              className="w-[160px]"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Row 3: Metric Selectors + Chart Type */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Primary:
            </span>
            <Select
              value={selectedMetric}
              onValueChange={(v) => setSelectedMetric(v as ChartMetric)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Secondary:
            </span>
            <Select
              value={secondaryMetric}
              onValueChange={(v) => setSecondaryMetric(v as ChartMetric)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-1">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
              className="h-9 w-9 p-0"
            >
              <LineChart className="w-4 h-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="h-9 w-9 p-0"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {renderChart()}
      </CardContent>
    </Card>
  );
}

export default MetricsChart;