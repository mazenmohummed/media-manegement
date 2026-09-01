import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// PATCH: Update concept status (separate endpoint for status transitions)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before accessing
    const { projectId, conceptId } = await params;

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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    // Only CREATIVE can submit DRAFT → IN_REVIEW
    if (status === 'IN_REVIEW' && concept.status === 'DRAFT') {
      // CREATIVE, ADMIN, SUPERADMIN, TEAMLEADER all can do this
      // Already covered by role check above
    }

    // Only ADMIN, SUPERADMIN, TEAMLEADER can approve or reject
    if ((status === 'APPROVED' || status === 'REJECTED') && 
        !['ADMIN', 'SUPERADMIN', 'TEAMLEADER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only Admins and Team Leaders can approve or reject concepts' },
        { status: 403 }
      );
    }

    // ─── Update the concept ──────────────────────────────────────────────────

    const updatedConcept = await prisma.concept.update({
      where: { id: conceptId },
      data: {
        status: status as any,
        // If there's feedback, append it to the description
        description: concept.description 
          ? concept.description + (feedback ? `\n\n📝 Status Update (${status}): ${feedback}` : '')
          : (feedback ? `📝 Status Update (${status}): ${feedback}` : undefined),
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

    return NextResponse.json(updatedConcept);
  } catch (error) {
    console.error('Error updating concept status:', error);
    return NextResponse.json(
      { error: 'Failed to update concept status' },
      { status: 500 }
    );
  }
}