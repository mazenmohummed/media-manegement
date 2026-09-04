// app/api/projects/[projectId]/concepts/[conceptId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before accessing
    const { projectId, conceptId } = await params;
    const agencyId = session.user.agencyId;

    // Validate IDs
    if (!projectId || !conceptId) {
      return NextResponse.json(
        { error: 'Project ID and Concept ID are required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, feedback } = body;

    const validStatuses = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // ─── Get User with Role ──────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ─── Get Concept ──────────────────────────────────────────────────────────
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId: user.agencyId,
      },
      include: {
        project: {
          select: { name: true },
        },
        assets: {
          select: { id: true },
        },
        reviewLinks: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    // ─── Role-based status transition validation ─────────────────────────────

    // Define allowed transitions based on user role
    const roleBasedTransitions: Record<string, { allowedRoles: string[], allowedFrom: string[] }> = {
      'IN_REVIEW': {
        allowedRoles: ['CREATIVE', 'ADMIN', 'SUPERADMIN', 'TEAMLEADER'],
        allowedFrom: ['DRAFT'],
      },
      'APPROVED': {
        allowedRoles: ['ADMIN', 'SUPERADMIN', 'TEAMLEADER'],
        allowedFrom: ['IN_REVIEW'],
      },
      'REJECTED': {
        allowedRoles: ['ADMIN', 'SUPERADMIN', 'TEAMLEADER'],
        allowedFrom: ['IN_REVIEW'],
      },
      'ARCHIVED': {
        allowedRoles: ['CREATIVE', 'ADMIN', 'SUPERADMIN', 'TEAMLEADER'],
        allowedFrom: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'],
      },
      'DRAFT': {
        allowedRoles: ['ADMIN', 'SUPERADMIN', 'TEAMLEADER'],
        allowedFrom: ['ARCHIVED'], // Only restore from archived
      },
    };

    // Check if the transition is allowed
    const transition = roleBasedTransitions[status];
    if (!transition) {
      return NextResponse.json(
        { error: `Invalid status transition to ${status}` },
        { status: 400 }
      );
    }

    // Check if user has the required role
    const userRole = user.role || 'CREATIVE';
    if (!transition.allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { 
          error: `Only ${transition.allowedRoles.join(', ')} can move concepts to ${status}`,
          requiredRoles: transition.allowedRoles,
          userRole: userRole,
        },
        { status: 403 }
      );
    }

    // Check if transition is allowed from current status
    if (!transition.allowedFrom.includes(concept.status)) {
      return NextResponse.json(
        { 
          error: `Cannot transition from ${concept.status} to ${status}. 
                  Allowed from: ${transition.allowedFrom.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // ─── Additional validations ──────────────────────────────────────────────

    // Only ADMIN, SUPERADMIN, TEAMLEADER can approve or reject
    if ((status === 'APPROVED' || status === 'REJECTED') && 
        !['ADMIN', 'SUPERADMIN', 'TEAMLEADER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only Admins and Team Leaders can approve or reject concepts' },
        { status: 403 }
      );
    }

    // Prevent approving a concept with no assets
    if (status === 'APPROVED' && concept.assets.length === 0) {
      return NextResponse.json(
        { error: 'Cannot approve a concept with no assets. Please add at least one asset first.' },
        { status: 400 }
      );
    }

    // ─── Update the concept ──────────────────────────────────────────────────

    const updatedConcept = await prisma.concept.update({
      where: { id: conceptId },
      data: {
        status: status as any,
        // If there's feedback, append it to the description or store separately
        description: concept.description 
          ? concept.description + (feedback ? `\n\n📝 Status Update (${status}): ${feedback}` : '')
          : (feedback ? `📝 Status Update (${status}): ${feedback}` : undefined),
      },
      include: {
        assets: {
          include: {
            versions: {
              orderBy: { versionNo: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    // ─── Log the action ──────────────────────────────────────────────────────

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Concept',
        entityId: conceptId,
        message: `Changed concept "${concept.name}" status from ${concept.status} to ${status}`,
        agencyId: user.agencyId,
        actorId: session.user.id,
        metadata: { 
          fromStatus: concept.status, 
          toStatus: status, 
          feedback, 
          userRole: userRole,
        },
      },
    });

    // ─── Create notification if status changed ──────────────────────────────

    const notificationMessages: Record<string, string> = {
      'IN_REVIEW': `Concept "${concept.name}" has been submitted for review.`,
      'APPROVED': `Concept "${concept.name}" has been approved! 🎉`,
      'REJECTED': `Concept "${concept.name}" has been rejected. ${feedback || ''}`,
      'ARCHIVED': `Concept "${concept.name}" has been archived.`,
      'DRAFT': `Concept "${concept.name}" has been restored from archive.`,
    };

    if (notificationMessages[status]) {
      // Find users to notify (assignees of linked task, or project team)
      const projectUsers = await prisma.user.findMany({
        where: {
          agencyId: user.agencyId,
          tasks: {
            some: {
              projectId: projectId,
            },
          },
        },
        select: { id: true },
        take: 10, // Limit to avoid spamming
      });

      for (const projectUser of projectUsers) {
        await prisma.notification.create({
          data: {
            userId: projectUser.id,
            agencyId: user.agencyId,
            title: `Concept Status Update: ${concept.name}`,
            message: notificationMessages[status],
            type: 'SYSTEM',
            actionUrl: `/dashboard/projects/${projectId}/concepts/${conceptId}`,
          },
        });
      }
    }

    return NextResponse.json({
      concept: updatedConcept,
      message: `Concept status updated to ${status}`,
      transition: {
        from: concept.status,
        to: status,
        allowed: true,
      },
    });

  } catch (error) {
    console.error('Error updating concept status:', error);
    return NextResponse.json(
      { error: 'Failed to update concept status' },
      { status: 500 }
    );
  }
}