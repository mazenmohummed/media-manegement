// components/digital-ads/PixelInstallChecklist.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { AdPlatform } from '@prisma/client';
import { ExternalLink, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PixelInstallChecklistProps {
  platform: AdPlatform;
  className?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  url: string;
  description?: string;
}

export function PixelInstallChecklist({ platform, className }: PixelInstallChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const platformChecklists: Record<AdPlatform, ChecklistItem[]> = {
    FACEBOOK: [
      { 
        id: 'fb-pixel', 
        label: 'Install Facebook Pixel in website header', 
        url: 'https://developers.facebook.com/docs/meta-pixel/get-started',
        description: 'Add the base pixel code to every page of your website'
      },
      { 
        id: 'fb-events', 
        label: 'Set up standard events', 
        url: 'https://developers.facebook.com/docs/meta-pixel/use-standard-events',
        description: 'PageView, Purchase, AddToCart, etc.'
      },
      { 
        id: 'fb-capi', 
        label: 'Configure Conversions API', 
        url: 'https://developers.facebook.com/docs/marketing-api/conversions-api',
        description: 'Recommended for iOS 14+ and better tracking accuracy'
      },
      { 
        id: 'fb-verify', 
        label: 'Verify pixel is firing correctly', 
        url: 'https://www.facebook.com/events_manager2/list/pixel',
        description: 'Use Facebook Pixel Helper or Events Manager test events'
      },
    ],
    INSTAGRAM: [
      { 
        id: 'ig-pixel', 
        label: 'Install Facebook Pixel (Instagram uses FB Pixel)', 
        url: 'https://developers.facebook.com/docs/instagram-api',
        description: 'Instagram ads use the same pixel as Facebook'
      },
      { 
        id: 'ig-events', 
        label: 'Configure standard events in Facebook Events Manager', 
        url: 'https://www.facebook.com/events_manager2/list/pixel',
        description: 'All events are managed through Facebook'
      },
      { 
        id: 'ig-capi', 
        label: 'Set up Conversions API', 
        url: 'https://developers.facebook.com/docs/marketing-api/conversions-api',
        description: 'Server-side tracking for Instagram'
      },
    ],
    TIKTOK: [
      { 
        id: 'tt-pixel', 
        label: 'Install TikTok Pixel in website header', 
        url: 'https://ads.tiktok.com/help/article/tiktok-pixel',
        description: 'Add the pixel code to your website'
      },
      { 
        id: 'tt-events', 
        label: 'Set up standard events', 
        url: 'https://ads.tiktok.com/help/article/tiktok-pixel-events',
        description: 'ViewContent, Purchase, AddToCart, etc.'
      },
      { 
        id: 'tt-events-api', 
        label: 'Configure Events API', 
        url: 'https://ads.tiktok.com/help/article/events-api',
        description: 'Server-side tracking for better accuracy'
      },
      { 
        id: 'tt-verify', 
        label: 'Test pixel with TikTok Pixel Helper', 
        url: 'https://ads.tiktok.com/help/article/pixel-helper',
        description: 'Verify pixel is firing correctly'
      },
    ],
    GOOGLE: [
      { 
        id: 'ga-pixel', 
        label: 'Install Google Ads conversion tracking tag', 
        url: 'https://support.google.com/google-ads/answer/1722054',
        description: 'Add conversion tracking to your website'
      },
      { 
        id: 'ga-events', 
        label: 'Set up Google Analytics 4 events', 
        url: 'https://developers.google.com/analytics/devguides/collection/ga4',
        description: 'Configure key events for tracking'
      },
      { 
        id: 'ga-enhanced', 
        label: 'Configure enhanced conversions', 
        url: 'https://support.google.com/google-ads/answer/9888656',
        description: 'Improve conversion tracking accuracy'
      },
      { 
        id: 'ga-verify', 
        label: 'Test with Google Tag Assistant', 
        url: 'https://tagassistant.google.com',
        description: 'Verify all tags are firing correctly'
      },
    ],
    YOUTUBE: [
      { 
        id: 'yt-conversion', 
        label: 'Set up YouTube conversion tracking', 
        url: 'https://support.google.com/youtube/answer/11190769',
        description: 'Track conversions from YouTube ads'
      },
      { 
        id: 'yt-ga', 
        label: 'Link YouTube with Google Analytics', 
        url: 'https://support.google.com/youtube/answer/10158983',
        description: 'Connect YouTube channel to GA4'
      },
      { 
        id: 'yt-brand', 
        label: 'Implement brand lift studies', 
        url: 'https://support.google.com/youtube/answer/11190769',
        description: 'Measure brand awareness impact'
      },
    ],
    SNAPCHAT: [
      { 
        id: 'sc-pixel', 
        label: 'Install Snapchat Pixel', 
        url: 'https://forbusiness.snapchat.com/help/articles/install-snapchat-pixel',
        description: 'Add pixel code to your website'
      },
      { 
        id: 'sc-events', 
        label: 'Configure Snapchat standard events', 
        url: 'https://developers.snap.com/ads-api/standard-events',
        description: 'Set up conversion events'
      },
      { 
        id: 'sc-verify', 
        label: 'Test with Snap Pixel Helper', 
        url: 'https://forbusiness.snapchat.com/help/articles/snap-pixel-helper',
        description: 'Verify pixel implementation'
      },
    ],
    X: [
      { 
        id: 'x-pixel', 
        label: 'Install X (Twitter) conversion tracking', 
        url: 'https://help.twitter.com/en/ads/website-conversion-tag',
        description: 'Add conversion tag to your website'
      },
      { 
        id: 'x-events', 
        label: 'Set up website events', 
        url: 'https://help.twitter.com/en/ads/website-events-tag',
        description: 'Configure conversion events'
      },
      { 
        id: 'x-verify', 
        label: 'Test with Twitter Pixel Helper', 
        url: 'https://help.twitter.com/en/ads/website-conversion-tag',
        description: 'Verify tracking is working'
      },
    ],
    LINKEDIN: [
      { 
        id: 'li-insight', 
        label: 'Install LinkedIn Insight Tag', 
        url: 'https://www.linkedin.com/help/lms/answer/65521',
        description: 'Add Insight Tag to your website'
      },
      { 
        id: 'li-conversion', 
        label: 'Set up conversion tracking', 
        url: 'https://www.linkedin.com/help/lms/answer/65522',
        description: 'Configure conversion events'
      },
      { 
        id: 'li-verify', 
        label: 'Verify with LinkedIn Insight Tag Helper', 
        url: 'https://www.linkedin.com/help/lms/answer/65521',
        description: 'Test the Insight Tag implementation'
      },
    ],
    OTHER: [
      { 
        id: 'other-tracking', 
        label: 'Review platform tracking requirements', 
        url: '#',
        description: 'Check documentation for tracking setup'
      },
      { 
        id: 'other-verify', 
        label: 'Test tracking implementation', 
        url: '#',
        description: 'Verify all tracking is working correctly'
      },
    ],
  };

  const checklist = platformChecklists[platform] || platformChecklists.OTHER;

  const toggleItem = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const allChecked = checklist.every(item => checkedItems[item.id]);
  const checkedCount = checklist.filter(item => checkedItems[item.id]).length;
  const progress = checklist.length > 0 ? (checkedCount / checklist.length) * 100 : 0;

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📋 Pixel Install Checklist</span>
            <span className="text-sm font-normal text-muted-foreground">
              {platform}
            </span>
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {checkedCount} / {checklist.length} complete
          </span>
        </CardTitle>
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklist.map((item) => (
          <div 
            key={item.id} 
            className={cn(
              "flex items-start space-x-3 p-3 rounded-lg transition-colors",
              checkedItems[item.id] ? "bg-green-50 dark:bg-green-950/20" : "hover:bg-muted/50"
            )}
          >
            <Checkbox
              id={item.id}
              checked={checkedItems[item.id] || false}
              onCheckedChange={() => toggleItem(item.id)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <label
                htmlFor={item.id}
                className={cn(
                  "text-sm font-medium leading-none cursor-pointer",
                  checkedItems[item.id] && "line-through text-muted-foreground"
                )}
              >
                {item.label}
              </label>
              {item.description && (
                <p className={cn(
                  "text-xs text-muted-foreground mt-1",
                  checkedItems[item.id] && "line-through"
                )}>
                  {item.description}
                </p>
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
              >
                Documentation <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {checkedItems[item.id] && (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            )}
          </div>
        ))}

        {allChecked && checklist.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  All pixel installation steps complete!
                </p>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Your tracking is ready to go. You can now launch your ad campaign with confidence.
                </p>
              </div>
            </div>
          </div>
        )}

        {!allChecked && checklist.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <div className="flex items-start gap-3">
              <Circle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  {checklist.length - checkedCount} steps remaining
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  Complete all steps before launching your campaign for proper tracking.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}