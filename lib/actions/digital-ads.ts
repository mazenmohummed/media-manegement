// lib/actions/digital-ads.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { DigitalCampaignStatus, AdPlatform } from '@prisma/client';

// ─── Create ──────────────────────────────────────────────────────────────

export async function createDigitalAdCampaign(data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return { success: false, error: 'Agency ID not found' };
    }

    // ✅ projectId is OPTIONAL — campaigns can exist standalone or be linked to a project
    const projectId: string | null = data.projectId || null;

    // If a projectId is provided, verify it belongs to this agency
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          agencyId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!project) {
        return { success: false, error: 'Project not found' };
      }
    }

    // ─── Generate UTM campaign slug if missing ─────────────────────────
    let utmCampaign = data.utmCampaign;
    if (!utmCampaign && data.landingPageUrl) {
      utmCampaign = `${String(data.name)
        .toLowerCase()
        .replace(/\s+/g, '-')}-${String(data.platform).toLowerCase()}`;
    }

    // ─── Build tracking URL with UTM params ────────────────────────────
    let landingPageUrl: string | null = data.landingPageUrl || null;
    if (landingPageUrl && (data.utmSource || data.utmMedium || utmCampaign)) {
      try {
        const url = new URL(landingPageUrl);
        if (data.utmSource) url.searchParams.set('utm_source', data.utmSource);
        if (data.utmMedium) url.searchParams.set('utm_medium', data.utmMedium);
        if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
        if (data.utmTerm) url.searchParams.set('utm_term', data.utmTerm);
        if (data.utmContent) url.searchParams.set('utm_content', data.utmContent);
        landingPageUrl = url.toString();
      } catch {
        // Invalid URL — keep the original
      }
    }

    // ─── Create the campaign ───────────────────────────────────────────
    const adCampaign = await prisma.digitalAdCampaign.create({
      data: {
        name: data.name,
        platform: data.platform as AdPlatform,
        budget: data.budget,
        currency: data.currency || 'EGP',
        landingPageUrl,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmTerm: data.utmTerm || null,
        utmContent: data.utmContent || null,
        pixelId: data.pixelId || null,
        audienceSegment: data.audienceSegment || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: (data.status as DigitalCampaignStatus) || 'DRAFT',
        projectId, // ✅ null or valid projectId
        agencyId,
      },
    });

    // ─── Revalidate paths ──────────────────────────────────────────────
    revalidatePath('/dashboard/digital-ads');
    if (projectId) {
      revalidatePath(`/dashboard/projects/${projectId}`);
      revalidatePath(`/dashboard/projects/${projectId}/digital-ads`);
    }

    return { success: true, id: adCampaign.id };
  } catch (error) {
    console.error('Error creating digital ad campaign:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create ad campaign',
    };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────

export async function updateDigitalAdCampaign(id: string, data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return { success: false, error: 'Agency ID not found' };
    }

    const existingAd = await prisma.digitalAdCampaign.findFirst({
      where: { id, agencyId, deletedAt: null },
      select: { id: true, projectId: true },
    });

    if (!existingAd) {
      return { success: false, error: 'Ad campaign not found' };
    }

    // ✅ Handle projectId change if provided
    let newProjectId: string | null | undefined = undefined;
    if (data.projectId !== undefined) {
      if (data.projectId === null || data.projectId === '') {
        newProjectId = null;
      } else {
        const project = await prisma.project.findFirst({
          where: {
            id: data.projectId,
            agencyId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!project) {
          return { success: false, error: 'Project not found' };
        }
        newProjectId = data.projectId;
      }
    }

    await prisma.digitalAdCampaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.platform !== undefined && {
          platform: data.platform as AdPlatform,
        }),
        ...(data.budget !== undefined && { budget: data.budget }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.landingPageUrl !== undefined && {
          landingPageUrl: data.landingPageUrl || null,
        }),
        ...(data.utmSource !== undefined && {
          utmSource: data.utmSource || null,
        }),
        ...(data.utmMedium !== undefined && {
          utmMedium: data.utmMedium || null,
        }),
        ...(data.utmCampaign !== undefined && {
          utmCampaign: data.utmCampaign || null,
        }),
        ...(data.utmTerm !== undefined && { utmTerm: data.utmTerm || null }),
        ...(data.utmContent !== undefined && {
          utmContent: data.utmContent || null,
        }),
        ...(data.pixelId !== undefined && { pixelId: data.pixelId || null }),
        ...(data.audienceSegment !== undefined && {
          audienceSegment: data.audienceSegment || null,
        }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.status !== undefined && {
          status: data.status as DigitalCampaignStatus,
        }),
        ...(newProjectId !== undefined && { projectId: newProjectId }),
      },
    });

    // ─── Revalidate ────────────────────────────────────────────────────
    revalidatePath('/dashboard/digital-ads');
    revalidatePath(`/dashboard/digital-ads/${id}`);

    if (existingAd.projectId) {
      revalidatePath(`/dashboard/projects/${existingAd.projectId}/digital-ads`);
      revalidatePath(`/dashboard/projects/${existingAd.projectId}/digital-ads/${id}`);
    }

    // If projectId changed, revalidate the new project's paths too
    if (
      newProjectId !== undefined &&
      newProjectId !== existingAd.projectId &&
      newProjectId !== null
    ) {
      revalidatePath(`/dashboard/projects/${newProjectId}/digital-ads`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating digital ad campaign:', error);
    return { success: false, error: 'Failed to update ad campaign' };
  }
}

// ─── Update Status ───────────────────────────────────────────────────────

export async function updateAdStatus(
  id: string,
  status: string,
  projectId?: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return { success: false, error: 'Agency ID not found' };
    }

    const existingAd = await prisma.digitalAdCampaign.findFirst({
      where: { id, agencyId, deletedAt: null },
      select: { id: true, projectId: true },
    });

    if (!existingAd) {
      return { success: false, error: 'Ad campaign not found' };
    }

    const validStatuses: DigitalCampaignStatus[] = [
      'DRAFT',
      'ACTIVE',
      'PAUSED',
      'COMPLETED',
    ];
    if (!validStatuses.includes(status as DigitalCampaignStatus)) {
      return { success: false, error: `Invalid status: ${status}` };
    }

    await prisma.digitalAdCampaign.update({
      where: { id },
      data: { status: status as DigitalCampaignStatus },
    });

    // ─── Revalidate ────────────────────────────────────────────────────
    revalidatePath('/dashboard/digital-ads');
    revalidatePath(`/dashboard/digital-ads/${id}`);

    const effectiveProjectId = projectId || existingAd.projectId;
    if (effectiveProjectId) {
      revalidatePath(`/dashboard/projects/${effectiveProjectId}/digital-ads`);
      revalidatePath(`/dashboard/projects/${effectiveProjectId}/digital-ads/${id}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating ad status:', error);
    return { success: false, error: 'Failed to update ad status' };
  }
}

// ─── Delete (Soft) ───────────────────────────────────────────────────────

export async function deleteDigitalAdCampaign(id: string, projectId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return { success: false, error: 'Agency ID not found' };
    }

    const existingAd = await prisma.digitalAdCampaign.findFirst({
      where: { id, agencyId, deletedAt: null },
      select: { id: true, projectId: true },
    });

    if (!existingAd) {
      return { success: false, error: 'Ad campaign not found' };
    }

    const metricCount = await prisma.adMetricSnapshot.count({
      where: { adCampaignId: id },
    });

    if (metricCount > 0) {
      return {
        success: false,
        error:
          'Cannot delete ad campaign with existing metrics data. Archive it instead.',
      };
    }

    await prisma.digitalAdCampaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // ─── Revalidate ────────────────────────────────────────────────────
    revalidatePath('/dashboard/digital-ads');

    const effectiveProjectId = projectId || existingAd.projectId;
    if (effectiveProjectId) {
      revalidatePath(`/dashboard/projects/${effectiveProjectId}/digital-ads`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting digital ad campaign:', error);
    return { success: false, error: 'Failed to delete ad campaign' };
  }
}

// ─── Generate Tracking URL ───────────────────────────────────────────────

export async function generateTrackingUrl(
  adId: string,
  projectId: string | undefined,
  params: {
    landingPageUrl: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return { success: false, error: 'Agency ID not found' };
    }

    const {
      landingPageUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
    } = params;

    if (!landingPageUrl) {
      return { success: false, error: 'Landing page URL is required' };
    }

    const existingAd = await prisma.digitalAdCampaign.findFirst({
      where: { id: adId, agencyId, deletedAt: null },
      select: { id: true, projectId: true },
    });

    if (!existingAd) {
      return { success: false, error: 'Ad campaign not found' };
    }

    let trackingUrl: string;
    try {
      const url = new URL(landingPageUrl);
      if (utmSource) url.searchParams.set('utm_source', utmSource);
      if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
      if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
      if (utmTerm) url.searchParams.set('utm_term', utmTerm);
      if (utmContent) url.searchParams.set('utm_content', utmContent);
      trackingUrl = url.toString();
    } catch {
      return { success: false, error: 'Invalid landing page URL' };
    }

    await prisma.digitalAdCampaign.update({
      where: { id: adId },
      data: {
        landingPageUrl: trackingUrl,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmTerm: utmTerm || null,
        utmContent: utmContent || null,
      },
    });

    // ─── Revalidate ────────────────────────────────────────────────────
    revalidatePath('/dashboard/digital-ads');
    revalidatePath(`/dashboard/digital-ads/${adId}`);

    const effectiveProjectId = projectId || existingAd.projectId;
    if (effectiveProjectId) {
      revalidatePath(`/dashboard/projects/${effectiveProjectId}/digital-ads`);
      revalidatePath(
        `/dashboard/projects/${effectiveProjectId}/digital-ads/${adId}`
      );
    }

    return { success: true, trackingUrl };
  } catch (error) {
    console.error('Error generating tracking URL:', error);
    return { success: false, error: 'Failed to generate tracking URL' };
  }
}