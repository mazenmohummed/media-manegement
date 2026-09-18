// lib/actions/campaigns.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { CampaignStatus } from '@prisma/client';

export async function createCampaign(data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    const count = await prisma.campaign.count({ where: { agencyId } });
    const campaignNo = `CMP-${String(count + 1).padStart(4, '0')}`;

    const campaign = await prisma.campaign.create({
      data: {
        campaignNo,
        name: data.name,
        objective: data.objective,
        budget: data.budget,
        currency: data.currency || 'EGP',
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: (data.status as CampaignStatus) || 'PLANNED',
        agencyId,
        clientId: data.clientId,
      },
      include: {
        client: { select: { id: true, clientName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'CAMPAIGN',
        entityId: campaign.id,
        message: `Created campaign ${campaign.name}`,
        agencyId,
        actorId: session.user.id || 'system',
        metadata: {
          campaignNo: campaign.campaignNo,
          budget: campaign.budget,
          clientId: campaign.clientId,
        },
      },
    });

    revalidatePath('/campaigns');
    return { success: true, id: campaign.id };
  } catch (error) {
    console.error('Error creating campaign:', error);
    return { success: false, error: 'Failed to create campaign' };
  }
}

export async function updateCampaign(id: string, data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    // ✅ findFirst, not findUnique
    const existingCampaign = await prisma.campaign.findFirst({
      where: { id, agencyId, deletedAt: null },
    });

    if (!existingCampaign) {
      throw new Error('Campaign not found');
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        objective: data.objective,
        budget: data.budget,
        currency: data.currency,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status as CampaignStatus,
        clientId: data.clientId,
      },
      include: {
        client: { select: { id: true, clientName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CAMPAIGN',
        entityId: campaign.id,
        message: `Updated campaign ${campaign.name}`,
        agencyId,
        actorId: session.user.id || 'system',
        metadata: { changes: Object.keys(data) },
      },
    });

    revalidatePath('/campaigns');
    revalidatePath(`/campaigns/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating campaign:', error);
    return { success: false, error: 'Failed to update campaign' };
  }
}

export async function deleteCampaign(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    // ✅ findFirst
    const existingCampaign = await prisma.campaign.findFirst({
      where: { id, agencyId, deletedAt: null },
    });

    if (!existingCampaign) {
      throw new Error('Campaign not found');
    }

    // ✅ many-to-many: filter projects via `campaigns.some`
    const activeProjectCount = await prisma.project.count({
      where: {
        campaigns: { some: { id } },
        deletedAt: null,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] },
      },
    });

    if (activeProjectCount > 0) {
      throw new Error('Cannot delete campaign with active projects');
    }

    await prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'CAMPAIGN',
        entityId: id,
        message: `Deleted campaign ${existingCampaign.name}`,
        agencyId,
        actorId: session.user.id || 'system',
      },
    });

    revalidatePath('/campaigns');
    return { success: true };
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return { success: false, error: 'Failed to delete campaign' };
  }
}

export async function getCampaign(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    // ✅ findFirst
    const campaign = await prisma.campaign.findFirst({
      where: { id, agencyId, deletedAt: null },
      include: {
        client: {
          select: { id: true, clientName: true, clientNo: true },
        },
        projects: {
          where: { deletedAt: null },
          include: {
            digitalAdCampaigns: {
              where: { deletedAt: null },
            },
          },
        },
        _count: {
          select: { projects: true, digitalAdCampaigns: true },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return { success: true, campaign };
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return { success: false, error: 'Failed to fetch campaign' };
  }
}