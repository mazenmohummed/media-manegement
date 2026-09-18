// components/integrations/MetaConnect.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function MetaConnect() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    isValid: boolean;
    isActive: boolean;
    lastError?: string;
  } | null>(null);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/integrations/meta/status');
      if (!response.ok) throw new Error('Failed to check status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Failed to check integration status');
    }
  };

  const connect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const accessToken = formData.get('accessToken') as string;
    const adAccountId = formData.get('adAccountId') as string;
    const refreshToken = formData.get('refreshToken') as string;

    try {
      const response = await fetch('/api/integrations/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken, adAccountId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect');
      }

      toast.success('Meta account connected successfully');
      await checkStatus();
    } catch (error) {
      console.error('Error connecting Meta:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Meta account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Meta Marketing API</span>
          {status && (
            <Badge variant={status.isValid ? 'default' : 'destructive'}>
              {status.isValid ? 'Connected' : 'Disconnected'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your Meta (Facebook/Instagram) ad account to automatically sync campaign metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg text-sm">
            <div className="flex items-center gap-2">
              {status.isValid ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Status: {status.isValid ? 'Connected' : 'Disconnected'}</span>
            </div>
            {status.lastError && (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span>{status.lastError}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={checkStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}

        <form onSubmit={connect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token</Label>
            <Input
              id="accessToken"
              name="accessToken"
              type="password"
              placeholder="EAAB..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adAccountId">Ad Account ID</Label>
            <Input
              id="adAccountId"
              name="adAccountId"
              placeholder="act_123456789"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refreshToken">Refresh Token (Optional)</Label>
            <Input
              id="refreshToken"
              name="refreshToken"
              type="password"
              placeholder="Refresh token for automatic token renewal"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect Meta Account'}
          </Button>
        </form>

        <div className="text-sm text-muted-foreground">
          <p>Once connected, metrics will be automatically synced daily.</p>
          <p className="mt-1">
            To get your access token, visit the{' '}
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Meta Graph API Explorer
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}