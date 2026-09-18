// app/api/departments/[departmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

// ─── Validation ─────────────────────────────────────────────────────────

const updateDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullable().optional(),
});

// ─── GET single department ──────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> } // ✅ Promise + departmentId
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { departmentId } = await params;

    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        users: {
          where: { deletedAt: null, isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
          orderBy: { name: 'asc' },
        },
        taskCategories: {
          where: { deletedAt: null },
          select: { id: true, name: true },
        },
        _count: {
          select: {
            users: true,
            taskCategories: true,
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ department });
  } catch (error) {
    console.error('[DEPARTMENT_GET_BY_ID]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update department ───────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { departmentId } = await params;
    const agencyId = session.user.agencyId;
    const body = await req.json();
    const data = updateDepartmentSchema.parse(body);

    // Verify ownership
    const existing = await prisma.department.findFirst({
      where: { id: departmentId, agencyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // If renaming, check for uniqueness within the agency
    if (data.name) {
      const duplicate = await prisma.department.findFirst({
        where: {
          agencyId,
          name: data.name,
          deletedAt: null,
          id: { not: departmentId },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A department with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.department.update({
      where: { id: departmentId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
      },
      include: {
        users: {
          where: { deletedAt: null, isActive: true },
          select: { id: true, name: true, role: true },
        },
        _count: {
          select: { users: true, taskCategories: true },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'DEPARTMENT',
        entityId: departmentId,
        message: `Updated department ${updated.name}`,
        agencyId,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ department: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    console.error('[DEPARTMENT_PATCH]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Soft delete department ─────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { departmentId } = await params;
    const agencyId = session.user.agencyId;

    // Verify ownership
    const existing = await prisma.department.findFirst({
      where: { id: departmentId, agencyId, deletedAt: null },
      include: {
        _count: {
          select: { users: true, taskCategories: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if department has active users
    const activeUserCount = await prisma.user.count({
      where: {
        departmentId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (activeUserCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department with ${activeUserCount} active user(s). Reassign them first.`,
          activeUserCount,
        },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.department.update({
      where: { id: departmentId },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'DEPARTMENT',
        entityId: departmentId,
        message: `Deleted department ${existing.name}`,
        agencyId,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DEPARTMENT_DELETE]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}