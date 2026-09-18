// app/api/digital-ads/[adId]/metrics/[metricId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ adId: string; metricId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { adId, metricId } = await params;

    // Verify metric belongs to agency's campaign
    const metric = await prisma.adMetricSnapshot.findFirst({
      where: {
        id: metricId,
        adCampaignId: adId,
        deletedAt: null,
        adCampaign: {
          agencyId,
          deletedAt: null,
        },
      },
    });

    if (!metric) {
      return NextResponse.json(
        { error: 'Metric not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.adMetricSnapshot.update({
      where: { id: metricId },
      data: { deletedAt: new Date() },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'AD_METRIC_SNAPSHOT',
        entityId: metricId,
        message: `Deleted metric for campaign ${adId}`,
        agencyId,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting metric:', error);
    return NextResponse.json(
      { error: 'Failed to delete metric' },
      { status: 500 }
    );
  }
}