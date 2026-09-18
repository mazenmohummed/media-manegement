// lib/services/ad-platform/google-ads.service.ts
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import { AdPlatform } from '@prisma/client';

interface GoogleCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  developerToken: string;
  customerId: string;
  loginCustomerId?: string;
}

interface GoogleInsights {
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

export class GoogleAdsService {
  private agencyId: string;
  private credentials?: GoogleCredentials;

  constructor(agencyId: string) {
    this.agencyId = agencyId;
  }

  async getCredentials(): Promise<GoogleCredentials | null> {
    const stored = await prisma.agencyIntegration.findFirst({
      where: {
        agencyId: this.agencyId,
        platform: 'GOOGLE_ADS',
        isActive: true,
      },
    });

    if (!stored) return null;

    try {
      const decrypted = decrypt(stored.credentials);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error decrypting Google Ads credentials:', error);
      return null;
    }
  }

  async storeCredentials(credentials: GoogleCredentials): Promise<void> {
    const encrypted = encrypt(JSON.stringify(credentials));

    await prisma.agencyIntegration.upsert({
      where: {
        agencyId_platform: {
          agencyId: this.agencyId,
          platform: 'GOOGLE_ADS',
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
        platform: 'GOOGLE_ADS',
        credentials: encrypted,
        isActive: true,
        expiresAt: credentials.expiresAt ? new Date(credentials.expiresAt) : null,
      },
    });
  }

  async refreshToken(): Promise<boolean> {
    const creds = await this.getCredentials();
    if (!creds) return false;

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: creds.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();

      const newCredentials: GoogleCredentials = {
        ...creds,
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

      await this.storeCredentials(newCredentials);
      this.credentials = newCredentials;
      return true;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      await this.markIntegrationInactive('Token refresh failed');
      return false;
    }
  }

  async markIntegrationInactive(reason: string): Promise<void> {
    await prisma.agencyIntegration.update({
      where: {
        agencyId_platform: {
          agencyId: this.agencyId,
          platform: 'GOOGLE_ADS',
        },
      },
      data: {
        isActive: false,
        lastError: reason,
        lastErrorAt: new Date(),
      },
    });
  }

  async fetchInsights(
    customerId: string,
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<GoogleInsights[]> {
    const creds = await this.getCredentials();
    if (!creds?.accessToken) {
      throw new Error('Google Ads not connected');
    }

    // Check if token is expired
    if (creds.expiresAt && Date.now() > creds.expiresAt) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        throw new Error('Token expired and refresh failed');
      }
    }

    try {
      // Format dates for Google Ads API
      const since = startDate.toISOString().split('T')[0];
      const until = endDate.toISOString().split('T')[0];

      // Build GAQL query
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.interactions,
          segments.date
        FROM campaign
        WHERE
          campaign.id = ${campaignId}
          AND segments.date BETWEEN '${since}' AND '${until}'
      `;

      const response = await fetch(
        `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
            'developer-token': creds.developerToken,
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.code === 401) {
          // Token expired
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.fetchInsights(customerId, campaignId, startDate, endDate);
          }
          throw new Error('Token expired');
        }
        throw new Error(`Google Ads API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      return data.results.map((row: any) => ({
        date: new Date(row.segments.date),
        reach: 0, // Google doesn't provide reach in campaign-level query
        impressions: parseInt(row.metrics.impressions) || 0,
        clicks: parseInt(row.metrics.clicks) || 0,
        spend: parseFloat(row.metrics.cost_micros) / 1000000 || 0,
        conversions: parseFloat(row.metrics.conversions) || 0,
        revenue: parseFloat(row.metrics.conversions_value) || 0,
        leads: 0, // Not available at this level
        engagement: parseInt(row.metrics.interactions) || 0,
      }));
    } catch (error) {
      console.error('Error fetching Google Ads insights:', error);
      throw error;
    }
  }

  async syncCampaign(campaignId: string): Promise<void> {
    const campaign = await prisma.digitalAdCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) throw new Error('Campaign not found');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();

    const insights = await this.fetchInsights(
      campaign.googleCustomerId!,
      campaign.googleCampaignId!,
      yesterday,
      today
    );

    const campaignInsight = insights[0];
    if (!campaignInsight) return;

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

    await prisma.digitalAdCampaign.update({
      where: { id: campaignId },
      data: { lastSyncedAt: new Date() },
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      const creds = await this.getCredentials();
      if (!creds) return false;

      const response = await fetch(
        `https://googleads.googleapis.com/v16/customers/${creds.customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${creds.accessToken}`,
            'developer-token': creds.developerToken,
          },
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}