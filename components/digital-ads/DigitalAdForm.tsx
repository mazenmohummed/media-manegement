// components/digital-ads/DigitalAdForm.tsx
'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Link2, Loader2 } from 'lucide-react';
import { PixelInstallChecklist } from './PixelInstallChecklist';
import { toast } from 'sonner';

// Define the platform enum values as a const array for better type inference
export const PLATFORM_OPTIONS = [
  'FACEBOOK',
  'INSTAGRAM',
  'TIKTOK',
  'GOOGLE',
  'YOUTUBE',
  'SNAPCHAT',
  'X',
  'LINKEDIN',
  'OTHER',
] as const;

export const STATUS_OPTIONS = [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
] as const;

export type Platform = (typeof PLATFORM_OPTIONS)[number];
export type DigitalAdStatus = (typeof STATUS_OPTIONS)[number];

// Define and export the schema with proper types
export const digitalAdSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  platform: z.enum(PLATFORM_OPTIONS),
  budget: z.number().min(0, 'Budget must be positive'),
  currency: z.string().default('EGP'),
  landingPageUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  pixelId: z.string().optional(),
  audienceSegment: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(STATUS_OPTIONS).default('DRAFT'),
  // ✅ NEW: Optional project linkage
  projectId: z.string().optional().nullable(),
});

// Input: what the form fields/defaultValues use (pre-default, pre-parse)
export type DigitalAdFormInput = z.input<typeof digitalAdSchema>;
// Output: what handleSubmit's callback receives (post-default, post-parse)
export type DigitalAdFormData = z.output<typeof digitalAdSchema>;

// ✅ Project option type for the selector
export interface ProjectOption {
  id: string;
  name: string;
  projectNo: string | null;
  client: { clientName: string };
}

interface DigitalAdFormProps {
  projectId?: string; // Optional — for project-scoped pages
  projects?: ProjectOption[]; // ✅ For agency-level pages
  adId?: string;
  initialData?: Partial<DigitalAdFormInput>;
  onSubmit?: (
    data: DigitalAdFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  onSuccess?: () => void;
}

export function DigitalAdForm({
  projectId,
  projects,
  adId,
  initialData,
  onSubmit: externalSubmit,
  onSuccess,
}: DigitalAdFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Show project selector only when:
  //  - We have a list of projects to choose from
  //  - We're NOT on a project-scoped page (no projectId prop)
  const showProjectSelector = !projectId && !!projects && projects.length > 0;

  // Use the form with all three generics: input, context, output
  const form = useForm<DigitalAdFormInput, any, DigitalAdFormData>({
    resolver: zodResolver(digitalAdSchema),
    defaultValues: {
      status: 'DRAFT',
      currency: 'EGP',
      platform: 'FACEBOOK',
      projectId: initialData?.projectId ?? null,
      ...initialData,
    },
  });

  const landingPageUrl = form.watch('landingPageUrl');
  const utmSource = form.watch('utmSource');
  const utmMedium = form.watch('utmMedium');
  const utmCampaign = form.watch('utmCampaign');
  const utmTerm = form.watch('utmTerm');
  const utmContent = form.watch('utmContent');
  const currentStatus = form.watch('status');

  useEffect(() => {
    if (landingPageUrl) {
      try {
        const url = new URL(landingPageUrl);
        if (utmSource) url.searchParams.set('utm_source', utmSource);
        if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
        if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
        if (utmTerm) url.searchParams.set('utm_term', utmTerm);
        if (utmContent) url.searchParams.set('utm_content', utmContent);
        setGeneratedUrl(url.toString());
      } catch (error) {
        // Invalid URL, ignore
      }
    } else {
      setGeneratedUrl('');
    }
  }, [landingPageUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent]);

  const handleSubmit = async (data: DigitalAdFormData) => {
    setIsSubmitting(true);
    try {
      // If external onSubmit is provided, use it
      if (externalSubmit) {
        const result = await externalSubmit(data);
        if (result.success) {
          toast.success(
            adId
              ? 'Ad campaign updated successfully'
              : 'Ad campaign created successfully'
          );
          if (onSuccess) {
            onSuccess();
          } else if (projectId) {
            router.push(`/dashboard/projects/${projectId}/digital-ads`);
          } else if (result.id) {
            router.push(`/dashboard/digital-ads/${result.id}`);
          } else {
            router.push('/dashboard/digital-ads');
          }
        } else {
          toast.error(result.error || 'Failed to save ad campaign');
        }
        return;
      }

      // Otherwise use the API directly
      // ✅ Choose the right API based on context
      const url = projectId
        ? `/api/projects/${projectId}/digital-ads${adId ? `/${adId}` : ''}`
        : `/api/digital-ads${adId ? `/${adId}` : ''}`;
      const method = adId ? 'PUT' : 'POST';

      const payload = {
        ...data,
        projectId: data.projectId || projectId || null,
        startDate: data.startDate?.toISOString(),
        endDate: data.endDate?.toISOString(),
        utmCampaign:
          data.utmCampaign ||
          `${data.name.toLowerCase().replace(/\s+/g, '-')}-${data.platform.toLowerCase()}`,
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
        throw new Error(error.error || 'Failed to save ad campaign');
      }

      const result = await response.json();
      toast.success(
        adId
          ? 'Ad campaign updated successfully'
          : 'Ad campaign created successfully'
      );

      if (onSuccess) {
        onSuccess();
      } else if (projectId) {
        router.push(`/dashboard/projects/${projectId}/digital-ads`);
      } else if (result.campaign?.id || result.id) {
        const id = result.campaign?.id || result.id;
        router.push(`/dashboard/digital-ads/${id}`);
      } else {
        router.push('/dashboard/digital-ads');
      }
    } catch (error) {
      console.error('Error saving ad campaign:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save ad campaign'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedUrl) {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('URL copied to clipboard');
    }
  };

  const handleGenerateTrackingUrl = async () => {
    if (!landingPageUrl) {
      toast.error('Please enter a landing page URL first');
      return;
    }

    if (!adId) {
      toast.error(
        'Please save the campaign first before generating a tracking URL'
      );
      return;
    }

    setIsLoading(true);
    try {
      // ✅ Choose the right API based on context
      const url = projectId
        ? `/api/projects/${projectId}/digital-ads/${adId}/generate-url`
        : `/api/digital-ads/${adId}/generate-url`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landingPageUrl,
          utmSource,
          utmMedium,
          utmCampaign:
            utmCampaign ||
            `${form
              .getValues('name')
              .toLowerCase()
              .replace(/\s+/g, '-')}-${form
              .getValues('platform')
              .toLowerCase()}`,
          utmTerm,
          utmContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate tracking URL');
      }

      const data = await response.json();
      setGeneratedUrl(data.trackingUrl);
      toast.success('Tracking URL generated successfully');
    } catch (error) {
      console.error('Error generating tracking URL:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to generate tracking URL'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="utm">UTM Builder</TabsTrigger>
            <TabsTrigger value="pixel">Pixel & Tracking</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Q4 Facebook Retargeting" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ✅ NEW: Optional Project Selector */}
            {showProjectSelector && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Project (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : value)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No project (standalone)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          No project (standalone)
                        </SelectItem>
                        {projects!.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.projectNo ? ` (${p.projectNo})` : ''} —{' '}
                            {p.client.clientName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link this ad campaign to a project, or leave standalone
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FACEBOOK">Facebook</SelectItem>
                        <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                        <SelectItem value="TIKTOK">TikTok</SelectItem>
                        <SelectItem value="GOOGLE">Google</SelectItem>
                        <SelectItem value="YOUTUBE">YouTube</SelectItem>
                        <SelectItem value="SNAPCHAT">Snapchat</SelectItem>
                        <SelectItem value="X">X (Twitter)</SelectItem>
                        <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PAUSED">Paused</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Status flow: DRAFT → ACTIVE ↔ PAUSED → COMPLETED
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                        placeholder="5000"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <DatePicker date={field.value} setDate={field.onChange} />
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
                      <DatePicker date={field.value} setDate={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="utm" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>UTM Builder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="landingPageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landing Page URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/landing-page"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The base URL where your ads will direct users
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="utmSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Source</FormLabel>
                        <FormControl>
                          <Input placeholder="facebook" {...field} />
                        </FormControl>
                        <FormDescription>
                          e.g., facebook, google, newsletter
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="utmMedium"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Medium</FormLabel>
                        <FormControl>
                          <Input placeholder="cpc" {...field} />
                        </FormControl>
                        <FormDescription>
                          e.g., cpc, email, social
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="utmCampaign"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Campaign</FormLabel>
                        <FormControl>
                          <Input placeholder="q4-retargeting" {...field} />
                        </FormControl>
                        <FormDescription>
                          Campaign identifier (auto-generated if left empty)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="utmTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Term (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="running-shoes" {...field} />
                        </FormControl>
                        <FormDescription>
                          Keywords or search terms
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="utmContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTM Content (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="ad-variant-a" {...field} />
                      </FormControl>
                      <FormDescription>
                        A/B testing variant identifier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateTrackingUrl}
                    disabled={isLoading || !landingPageUrl || !adId}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Tracking URL'
                    )}
                  </Button>
                  {!adId && (
                    <p className="text-sm text-muted-foreground self-center">
                      Save the campaign first to generate a tracking URL
                    </p>
                  )}
                </div>

                {generatedUrl && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">
                          Generated Tracking URL
                        </p>
                        <p className="text-sm text-muted-foreground break-all">
                          {generatedUrl}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="ml-4"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-green-600">
                      <Link2 className="w-4 h-4 mr-1" />
                      URL is ready to use
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pixel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pixel Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="pixelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pixel ID</FormLabel>
                      <FormControl>
                        <Input placeholder="123456789012345" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your platform's pixel/tracking ID
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <PixelInstallChecklist platform={form.watch('platform')} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audience Targeting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="audienceSegment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience Segment</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tech-savvy millennials 25-34"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Define your target audience segment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Common Segments</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() =>
                        form.setValue(
                          'audienceSegment',
                          'Working Professionals 25-40'
                        )
                      }
                    >
                      Working Professionals 25-40
                    </Badge>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() =>
                        form.setValue('audienceSegment', 'Students 18-24')
                      }
                    >
                      Students 18-24
                    </Badge>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() =>
                        form.setValue(
                          'audienceSegment',
                          'Parents with Kids 30-45'
                        )
                      }
                    >
                      Parents with Kids 30-45
                    </Badge>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() =>
                        form.setValue(
                          'audienceSegment',
                          'Tech Enthusiasts 18-35'
                        )
                      }
                    >
                      Tech Enthusiasts 18-35
                    </Badge>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() =>
                        form.setValue(
                          'audienceSegment',
                          'Luxury Shoppers 30-55'
                        )
                      }
                    >
                      Luxury Shoppers 30-55
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
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
                Saving...
              </>
            ) : adId ? (
              'Update Ad Campaign'
            ) : (
              'Create Ad Campaign'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}