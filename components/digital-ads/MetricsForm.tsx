// components/digital-ads/MetricsForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const metricsSchema = z.object({
  date: z.date({
    error: 'Date is required',
  }),
  reach: z.number().min(0, 'Reach must be positive'),
  impressions: z.number().min(0, 'Impressions must be positive'),
  clicks: z.number().min(0, 'Clicks must be positive'),
  spend: z.number().min(0, 'Spend must be positive'),
  conversions: z.number().min(0, 'Conversions must be positive'),
  revenue: z.number().min(0, 'Revenue must be positive'),
  leads: z.number().min(0, 'Leads must be positive'),
  engagement: z.number().min(0, 'Engagement must be positive'),
});

type MetricsFormData = z.infer<typeof metricsSchema>;

interface MetricsFormProps {
  // ✅ Both props now optional — the form picks the right API based on what's provided
  projectId?: string;
  adId: string;
  onSuccess?: () => void;
  initialData?: Partial<MetricsFormData>;
}

export function MetricsForm({
  projectId,
  adId,
  onSuccess,
  initialData,
}: MetricsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [computedMetrics, setComputedMetrics] = useState<{
    ctr: number;
    cpc: number;
    cpm: number;
    roas: number;
  } | null>(null);

  const form = useForm<MetricsFormData>({
    resolver: zodResolver(metricsSchema),
    defaultValues: {
      date: new Date(),
      reach: 0,
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      revenue: 0,
      leads: 0,
      engagement: 0,
      ...initialData,
    },
  });

  const watchFields = form.watch();

  // Auto-compute metrics when fields change
  const computeMetrics = () => {
    const { impressions, clicks, spend, revenue } = watchFields;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const roas = spend > 0 ? revenue / spend : 0;

    setComputedMetrics({ ctr, cpc, cpm, roas });
  };

  const handleSubmit = async (data: MetricsFormData) => {
    setIsSubmitting(true);
    try {
      // ✅ Choose the API endpoint based on context
      // If projectId is provided → project-scoped API
      // Otherwise → agency-level API
      const url = projectId
        ? `/api/projects/${projectId}/digital-ads/${adId}/metrics`
        : `/api/digital-ads/${adId}/metrics`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: data.date.toISOString(),
          reach: data.reach,
          impressions: data.impressions,
          clicks: data.clicks,
          spend: data.spend,
          conversions: data.conversions,
          revenue: data.revenue,
          leads: data.leads,
          engagement: data.engagement,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save metrics');
      }

      toast.success('Metrics saved successfully');
      if (onSuccess) onSuccess();

      // Reset the form
      form.reset({
        date: new Date(),
        reach: 0,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        revenue: 0,
        leads: 0,
        engagement: 0,
      });
      setComputedMetrics(null);

      // ✅ Refresh server data so the list/table updates
      router.refresh();
    } catch (error) {
      console.error('Error saving metrics:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save metrics'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Daily Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <DatePicker date={field.value} setDate={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="reach"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reach</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseInt(e.target.value) || 0);
                          computeMetrics();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="impressions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impressions</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseInt(e.target.value) || 0);
                          computeMetrics();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clicks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clicks</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseInt(e.target.value) || 0);
                          computeMetrics();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="spend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spend ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value) || 0);
                          computeMetrics();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conversions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversions</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseInt(e.target.value) || 0);
                          computeMetrics();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value) || 0);
                          computeMetrics();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leads</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseInt(e.target.value) || 0);
                          computeMetrics();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="engagement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseInt(e.target.value) || 0);
                          computeMetrics();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {computedMetrics && (
              <div className="p-4 bg-muted rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">CTR</p>
                  <p className="text-lg font-semibold">
                    {computedMetrics.ctr.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPC</p>
                  <p className="text-lg font-semibold">
                    ${computedMetrics.cpc.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPM</p>
                  <p className="text-lg font-semibold">
                    ${computedMetrics.cpm.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ROAS</p>
                  <p className="text-lg font-semibold">
                    {computedMetrics.roas.toFixed(2)}x
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Metrics'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}