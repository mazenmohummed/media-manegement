import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// PATCH: Update brief status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await req.json();
    const { status, feedback } = body;

    const validStatuses = ['DRAFT', 'PENDING_CLIENT_APPROVAL', 'APPROVED', 'REVISIONS_REQUIRED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, role: true },
    });

    // Verify project exists and belongs to the agency
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: user?.agencyId,
      },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if brief exists
    const existingBrief = await prisma.creativeBrief.findUnique({
      where: { projectId },
    });

    if (!existingBrief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['PENDING_CLIENT_APPROVAL'],
      PENDING_CLIENT_APPROVAL: ['APPROVED', 'REVISIONS_REQUIRED'],
      APPROVED: [],
      REVISIONS_REQUIRED: ['DRAFT', 'PENDING_CLIENT_APPROVAL'],
    };

    if (!validTransitions[existingBrief.status].includes(status)) {
      return NextResponse.json(
        { 
          error: `Cannot transition from ${existingBrief.status} to ${status}. 
                  Allowed transitions: ${validTransitions[existingBrief.status].join(', ') || 'none'}` 
        },
        { status: 400 }
      );
    }

    // Additional validation for approvals
    if (status === 'APPROVED' && !['ADMIN', 'SUPERADMIN', 'TEAMLEADER'].includes(user?.role || '')) {
      return NextResponse.json(
        { error: 'Only Admins and Team Leaders can approve briefs' },
        { status: 403 }
      );
    }

    const brief = await prisma.creativeBrief.update({
      where: { projectId },
      data: {
        status: status as any,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeBrief',
        entityId: brief.id,
        message: `Changed brief status from ${existingBrief.status} to ${status} for project "${project.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
        metadata: { fromStatus: existingBrief.status, toStatus: status, feedback },
      },
    });

    return NextResponse.json(brief);
  } catch (error) {
    console.error('Error updating brief status:', error);
    return NextResponse.json(
      { error: 'Failed to update brief status' },
      { status: 500 }
    );
  }
}