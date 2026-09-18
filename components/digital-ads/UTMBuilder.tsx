// components/digital-ads/UTMBuilder.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Check, Link2 } from 'lucide-react';

interface UTMBuilderProps {
  baseUrl: string;
  onUrlGenerated: (url: string) => void;
}

export function UTMBuilder({ baseUrl, onUrlGenerated }: UTMBuilderProps) {
  const [utmParams, setUtmParams] = useState({
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
  });
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const generateUrl = () => {
    if (!baseUrl) return;

    const url = new URL(baseUrl);
    if (utmParams.source) url.searchParams.set('utm_source', utmParams.source);
    if (utmParams.medium) url.searchParams.set('utm_medium', utmParams.medium);
    if (utmParams.campaign) url.searchParams.set('utm_campaign', utmParams.campaign);
    if (utmParams.term) url.searchParams.set('utm_term', utmParams.term);
    if (utmParams.content) url.searchParams.set('utm_content', utmParams.content);

    const finalUrl = url.toString();
    setGeneratedUrl(finalUrl);
    onUrlGenerated(finalUrl);
  };

  const copyToClipboard = async () => {
    if (generatedUrl) {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>UTM Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="utm-source">UTM Source</Label>
            <Input
              id="utm-source"
              placeholder="facebook"
              value={utmParams.source}
              onChange={(e) => setUtmParams({ ...utmParams, source: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="utm-medium">UTM Medium</Label>
            <Input
              id="utm-medium"
              placeholder="cpc"
              value={utmParams.medium}
              onChange={(e) => setUtmParams({ ...utmParams, medium: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="utm-campaign">UTM Campaign</Label>
            <Input
              id="utm-campaign"
              placeholder="q4-retargeting"
              value={utmParams.campaign}
              onChange={(e) => setUtmParams({ ...utmParams, campaign: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="utm-term">UTM Term (Optional)</Label>
            <Input
              id="utm-term"
              placeholder="running-shoes"
              value={utmParams.term}
              onChange={(e) => setUtmParams({ ...utmParams, term: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="utm-content">UTM Content (Optional)</Label>
          <Input
            id="utm-content"
            placeholder="ad-variant-a"
            value={utmParams.content}
            onChange={(e) => setUtmParams({ ...utmParams, content: e.target.value })}
          />
        </div>

        <Button onClick={generateUrl} className="w-full">
          Generate Tracking URL
        </Button>

        {generatedUrl && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Tracking URL</p>
                <p className="text-sm text-muted-foreground break-all">{generatedUrl}</p>
              </div>
              <Button
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
  );
}