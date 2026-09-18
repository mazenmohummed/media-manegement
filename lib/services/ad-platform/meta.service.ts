// lib/services/ad-platform/meta.service.ts
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import { AdPlatform } from '@prisma/client';

interface MetaCredentials {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
  accountId: string;
  adAccountId: string;
}

interface MetaInsights {
  date: Date;
  reach: number;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  leads: number;
  engagement: number;
}

export class MetaMarketingService {
  private agencyId: string;
  private credentials?: MetaCredentials;

  constructor(agencyId: string) {
    this.agencyId = agencyId;
  }

  /**
   * Get stored credentials for the agency
   */
  async getCredentials(): Promise<MetaCredentials | null> {
    const stored = await prisma.agencyIntegration.findFirst({
      where: {
        agencyId: this.agencyId,
        platform: 'META',
        isActive: true,
      },
    });

    if (!stored) return null;

    try {
      const decrypted = decrypt(stored.credentials);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error decrypting Meta credentials:', error);
      return null;
    }
  }

  /**
   * Store or update OAuth credentials
   */
  async storeCredentials(credentials: MetaCredentials): Promise<void> {
    const encrypted = encrypt(JSON.stringify(credentials));

    await prisma.agencyIntegration.upsert({
      where: {
        agencyId_platform: {
          agencyId: this.agencyId,
          platform: 'META',
        },
      },
      update: {
        credentials: encrypted,
        isActive: true,
        lastUsedAt: new Date(),
        expiresAt: credentials.expiresAt ? new Date(credentials.expiresAt) : null,
      },
      create: {
        agencyId: this.agencyId,
        platform: 'META',
        credentials: encrypted,
        isActive: true,
        expiresAt: credentials.expiresAt ? new Date(credentials.expiresAt) : null,
      },
    });
  }

  /**
   * Refresh expired access token
   */
  async refreshToken(): Promise<boolean> {
    const creds = await this.getCredentials();
    if (!creds?.refreshToken) return false;

    try {
      // Call Meta OAuth refresh endpoint
      const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'fb_exchange_token',
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          fb_exchange_token: creds.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      const newCredentials: MetaCredentials = {
        ...creds,
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

      await this.storeCredentials(newCredentials);
      this.credentials = newCredentials;
      return true;
    } catch (error) {
      console.error('Error refreshing Meta token:', error);
      await this.markIntegrationInactive('Token refresh failed');
      return false;
    }
  }

  /**
   * Mark integration as inactive (needs reconnection)
   */
  async markIntegrationInactive(reason: string): Promise<void> {
    await prisma.agencyIntegration.update({
      where: {
        agencyId_platform: {
          agencyId: this.agencyId,
          platform: 'META',
        },
      },
      data: {
        isActive: false,
        lastError: reason,
        lastErrorAt: new Date(),
      },
    });
  }

  /**
   * Fetch daily insights for a specific ad account and date range
   */
  async fetchInsights(
    adAccountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetaInsights[]> {
    const creds = await this.getCredentials();
    if (!creds?.accessToken) {
      throw new Error('Meta not connected');
    }

    // Check if token is expired
    if (creds.expiresAt && Date.now() > creds.expiresAt) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        throw new Error('Token expired and refresh failed');
      }
    }

    try {
      // Format dates for Meta API
      const since = startDate.toISOString().split('T')[0];
      const until = endDate.toISOString().split('T')[0];

      // Build API URL
      const url = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` + new URLSearchParams({
        access_token: creds.accessToken,
        level: 'campaign',
        fields: [
          'campaign_name',
          'campaign_id',
          'reach',
          'impressions',
          'clicks',
          'spend',
          'conversions',
          'conversions_value',
          'leads',
          'engagement',
          'ctr',
          'cpc',
          'cpm',
          'roas',
        ].join(','),
        time_range: JSON.stringify({
          since,
          until,
        }),
        time_increment: '1',
      });

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.code === 190) {
          // Token expired
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry with new token
            return this.fetchInsights(adAccountId, startDate, endDate);
          }
          throw new Error('Token expired');
        }
        throw new Error(`Meta API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      return data.data.map((item: any) => ({
        date: new Date(item.date_start),
        reach: parseInt(item.reach) || 0,
        impressions: parseInt(item.impressions) || 0,
        clicks: parseInt(item.clicks) || 0,
        spend: parseFloat(item.spend) || 0,
        conversions: parseInt(item.conversions) || 0,
        revenue: parseFloat(item.conversions_value) || 0,
        leads: parseInt(item.leads) || 0,
        engagement: parseInt(item.engagement) || 0,
      }));
    } catch (error) {
      console.error('Error fetching Meta insights:', error);
      throw error;
    }
  }

  /**
   * Sync all active campaigns for the agency
   */
  async syncAllCampaigns(): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const campaigns = await prisma.digitalAdCampaign.findMany({
      where: {
        agencyId: this.agencyId,
        platform: 'FACEBOOK',
        status: 'ACTIVE',
        deletedAt: null,
        // Only sync campaigns that have been connected
        metaAdAccountId: { not: null },
        metaCampaignId: { not: null },
      },
    });

    const results = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const campaign of campaigns) {
      try {
        await this.syncCampaign(campaign.id);
        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Campaign ${campaign.name} (${campaign.id}): ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return results;
  }

  /**
   * Sync a single campaign's metrics
   */
  async syncCampaign(campaignId: string): Promise<void> {
    const campaign = await prisma.digitalAdCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) throw new Error('Campaign not found');

    // Get yesterday's data (Meta data is usually available by next day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();

    const insights = await this.fetchInsights(
      campaign.metaAdAccountId!,
      yesterday,
      today
    );

    // Look for the specific campaign in the insights
    const campaignInsight = insights.find(
      (insight) => insight.date.getDate() === yesterday.getDate()
    );

    if (!campaignInsight) {
      // No data for yesterday yet - might be too early
      return;
    }

    // Save or update the metric
    await prisma.adMetricSnapshot.upsert({
      where: {
        adCampaignId_date: {
          adCampaignId: campaignId,
          date: campaignInsight.date,
        },
      },
      update: {
        reach: campaignInsight.reach,
        impressions: campaignInsight.impressions,
        clicks: campaignInsight.clicks,
        spend: campaignInsight.spend,
        conversions: campaignInsight.conversions,
        revenue: campaignInsight.revenue,
        leads: campaignInsight.leads,
        engagement: campaignInsight.engagement,
        // Auto-compute derived metrics
        ctr: campaignInsight.impressions > 0 
          ? (campaignInsight.clicks / campaignInsight.impressions) * 100 
          : 0,
        cpc: campaignInsight.clicks > 0 
          ? campaignInsight.spend / campaignInsight.clicks 
          : 0,
        cpm: campaignInsight.impressions > 0 
          ? (campaignInsight.spend / campaignInsight.impressions) * 1000 
          : 0,
        roas: campaignInsight.spend > 0 
          ? campaignInsight.revenue / campaignInsight.spend 
          : 0,
        syncedAt: new Date(),
      },
      create: {
        date: campaignInsight.date,
        reach: campaignInsight.reach,
        impressions: campaignInsight.impressions,
        clicks: campaignInsight.clicks,
        spend: campaignInsight.spend,
        conversions: campaignInsight.conversions,
        revenue: campaignInsight.revenue,
        leads: campaignInsight.leads,
        engagement: campaignInsight.engagement,
        ctr: campaignInsight.impressions > 0 
          ? (campaignInsight.clicks / campaignInsight.impressions) * 100 
          : 0,
        cpc: campaignInsight.clicks > 0 
          ? campaignInsight.spend / campaignInsight.clicks 
          : 0,
        cpm: campaignInsight.impressions > 0 
          ? (campaignInsight.spend / campaignInsight.impressions) * 1000 
          : 0,
        roas: campaignInsight.spend > 0 
          ? campaignInsight.revenue / campaignInsight.spend 
          : 0,
        adCampaignId: campaignId,
        agencyId: this.agencyId,
        syncedAt: new Date(),
      },
    });

    // Update campaign's last synced timestamp
    await prisma.digitalAdCampaign.update({
      where: { id: campaignId },
      data: { lastSyncedAt: new Date() },
    });
  }

  /**
   * Validate connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const creds = await this.getCredentials();
      if (!creds) return false;

      // Test the token by making a small API call
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${creds.adAccountId}?` +
        new URLSearchParams({
          access_token: creds.accessToken,
          fields: 'id,name',
        })
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}