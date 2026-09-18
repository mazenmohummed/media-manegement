// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import bcrypt from 'bcryptjs';
import { z, ZodError } from 'zod';

// ─── Validation Schema ──────────────────────────────────────────────────

const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'OPERATOR', 'TEAMLEADER', 'CREATIVE', 'FINANCE']),
  userType: z
    .enum(['FULL_TIME', 'PART_TIME', 'FREELANCER', 'INTERN'])
    .default('FULL_TIME'),
  departmentId: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  baseSalary: z.number().min(0).optional(),
  efficiencyRate: z.number().min(0).max(2).optional(),
});

// ─── GET: List Employees ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const departmentId = searchParams.get('departmentId');

    const where: any = {
      agencyId: session.user.agencyId,
      deletedAt: null,
    };

    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        userNo: true,
        name: true,
        email: true,
        avatarUrl: true,
        phoneNumber: true,
        role: true,
        userType: true,
        isActive: true,
        baseSalary: true,
        efficiencyRate: true,
        walletBalance: true,
        lastLoginAt: true,
        createdAt: true,
        department: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// ─── POST: Create Employee ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const body = await req.json();
    const data = createEmployeeSchema.parse(body);

    // ─── Check subscription limit ──────────────────────────────────────
    const subscription = await prisma.subscription.findUnique({
      where: { agencyId },
      select: { maxUsers: true },
    });

    const currentCount = await prisma.user.count({
      where: { agencyId, deletedAt: null },
    });

    const maxUsers = subscription?.maxUsers ?? 5;
    if (currentCount >= maxUsers) {
      return NextResponse.json(
        {
          error: `User limit reached (${currentCount}/${maxUsers}). Upgrade your plan to add more users.`,
        },
        { status: 403 }
      );
    }

    // ─── Check if email is already taken ───────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // ─── Validate department if provided ───────────────────────────────
    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: data.departmentId,
          agencyId,
          deletedAt: null,
        },
      });
      if (!department) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }
    }

    // ─── Hash password ─────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // ─── Generate employee number ──────────────────────────────────────
    const count = await prisma.user.count({
      where: { agencyId },
    });
    const userNo = `EMP-${String(count + 1).padStart(4, '0')}`;

    // ─── Create the user ───────────────────────────────────────────────
    const user = await prisma.user.create({
      data: {
        userNo,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        userType: data.userType,
        departmentId: data.departmentId || null,
        phoneNumber: data.phoneNumber || null,
        baseSalary: data.baseSalary ?? 0,
        efficiencyRate: data.efficiencyRate ?? 1.0,
        agencyId,
        isActive: true,
      },
      select: {
        id: true,
        userNo: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
      },
    });

    // ─── Audit log ─────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'USER',
        entityId: user.id,
        message: `Created employee ${user.name} (${user.userNo})`,
        agencyId,
        actorId: session.user.id,
        metadata: {
          userNo: user.userNo,
          role: user.role,
          userType: user.userType,
        },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
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
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}