// components/campaigns/CampaignForm.tsx
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { ClientSelector } from '@/components/clients/ClientSelector';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Define status options as const for better type inference
export const CAMPAIGN_STATUS_OPTIONS = [
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED'
] as const;

export type CampaignStatus = typeof CAMPAIGN_STATUS_OPTIONS[number];

// Define and export the schema with proper types
export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  objective: z.string().optional(),
  budget: z.number().min(0, 'Budget must be positive'),
  currency: z.string().default('EGP'),
  startDate: z.date({
    error: 'Start date is required',
  }),
  endDate: z.date().optional(),
  clientId: z.string().min(1, 'Client is required'),
  status: z.enum(CAMPAIGN_STATUS_OPTIONS).default('PLANNED'),
});

// Input: what the form fields/defaultValues use (pre-default, pre-parse)
export type CampaignFormInput = z.input<typeof campaignSchema>;
// Output: what handleSubmit's callback receives (post-default, post-parse)
export type CampaignFormData = z.output<typeof campaignSchema>;

interface CampaignFormProps {
  campaignId?: string;
  initialData?: Partial<CampaignFormInput>;
  onSubmit?: (data: CampaignFormData) => Promise<{ success: boolean; id?: string; error?: string }>;
  onSuccess?: () => void;
}

export function CampaignForm({ campaignId, initialData, onSubmit: externalSubmit, onSuccess }: CampaignFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the form with all three generics: input, context, output
  const form = useForm<CampaignFormInput, any, CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      status: 'PLANNED',
      currency: 'EGP',
      startDate: new Date(),
      ...initialData,
    },
  });

  const handleSubmit = async (data: CampaignFormData) => {
    setIsSubmitting(true);
    try {
      // If external onSubmit is provided, use it
      if (externalSubmit) {
        const result = await externalSubmit(data);
        if (result.success) {
          toast.success(campaignId ? 'Campaign updated successfully' : 'Campaign created successfully');
          if (onSuccess) {
            onSuccess();
          } else if (result.id) {
            router.push(`/campaigns/${result.id}`);
          } else {
            router.push('/campaigns');
          }
        } else {
          toast.error(result.error || 'Failed to save campaign');
        }
        return;
      }

      // Otherwise use the API directly
      const url = campaignId ? `/api/campaigns/${campaignId}` : '/api/campaigns';
      const method = campaignId ? 'PUT' : 'POST';
      
      const payload = {
        ...data,
        startDate: data.startDate?.toISOString(),
        endDate: data.endDate?.toISOString(),
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save campaign');
      }

      const result = await response.json();
      toast.success(campaignId ? 'Campaign updated successfully' : 'Campaign created successfully');
      
      if (onSuccess) {
        onSuccess();
      } else if (result.campaign?.id) {
        router.push(`/campaigns/${result.campaign.id}`);
      } else {
        router.push('/campaigns');
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Name</FormLabel>
              <FormControl>
                <Input placeholder="Q4 Social Media Campaign" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="objective"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objective</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Campaign objectives and goals"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="10000"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EGP">EGP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    setDate={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    setDate={field.onChange}
                    placeholder="Select end date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <FormControl>
                <ClientSelector
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select a client for this campaign"
                />
              </FormControl>
              <FormDescription>
                The client this campaign is for
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Status flow: PLANNED → ACTIVE ↔ PAUSED → COMPLETED/CANCELLED
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {campaignId ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              campaignId ? 'Update Campaign' : 'Create Campaign'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}