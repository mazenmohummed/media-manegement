import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Helper function to handle user updates for both PATCH and PUT
async function handleUserUpdate(req: Request, agencyId: string, id: string) {
  const body = await req.json();
  const db = getScopedPrisma(agencyId);

  const existingEmployee = await db.user.findFirst({
    where: { id, agencyId },
  });

  if (!existingEmployee) {
    return NextResponse.json({ error: "Unauthorized update attempt or user not found" }, { status: 404 });
  }

  const updateData: Record<string, any> = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.role !== undefined) updateData.role = body.role;
  if (body.userType !== undefined) updateData.userType = body.userType;
  
  if (body.baseSalary !== undefined && body.baseSalary !== null && body.baseSalary !== "") {
    updateData.baseSalary = Math.abs(parseFloat(String(body.baseSalary))) || 0;
  }

  if (body.walletBalance !== undefined) {
    updateData.walletBalance = parseFloat(String(body.walletBalance)) || 0;
  }

  if (body.efficiencyRate !== undefined && body.efficiencyRate !== null && body.efficiencyRate !== "") {
    updateData.efficiencyRate = parseFloat(String(body.efficiencyRate));
  }

  if (body.verifiedSkills !== undefined) {
    updateData.verifiedSkills = Array.isArray(body.verifiedSkills) ? body.verifiedSkills : [];
  }

  if (body.password && body.password.trim() !== "") {
    updateData.password = await bcrypt.hash(body.password, 10);
  }

  const updatedEmployee = await db.user.update({
    where: { id },
    data: updateData,
  });

  const { password: _pw, ...safeUser } = updatedEmployee as any;
  return NextResponse.json(safeUser);
}

// ─── GET /api/users/[id] ──────────────────────────────────────────────────
export const GET = withAuthGuard("user:read", async (req, { agencyId }, context) => {
  try {
    const { id } = await context.params;
    const db = getScopedPrisma(agencyId);

    const employee = await db.user.findFirst({
      where: { id, agencyId },
      include: {
        tasks: {
          include: { project: true },
          orderBy: { startDate: "desc" },
        },
        attendanceLogs: {
          take: 30,
          orderBy: { date: "desc" },
          include: {
            task: {
              include: {
                project: true,
              },
            },
          },
        },
        payouts: {
          orderBy: { date: "desc" },
        },
        financialLedger: {
          orderBy: { createdAt: "desc" },
        },
        attachments: true,
        agency: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found in your workspace" }, { status: 404 });
    }

    // Safely sort embedded leave entries in memory (most recent first)
    const sortedLeaves = (employee as any).leaves
      ? [...(employee as any).leaves].sort(
          (a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )
      : [];

    // Server-side calculated metrics
    const totalGrossRevenue = employee.tasks.reduce((sum, t) => sum + (t.internalCost || 0), 0);
    const totalMarginValue = employee.tasks.reduce((sum, t) => sum + (t.marginAmount || 0), 0);

    const { password: _pw, leaves, ...userFields } = employee as any;

    return NextResponse.json({
      ...userFields,
      leaves: sortedLeaves,
      stats: {
        totalGrossRevenue,
        totalMarginValue,
        taskCount: employee.tasks.length,
        efficiencyRate: employee.efficiencyRate || 1.0,
      },
    });
  } catch (error) {
    console.error("[GET_USER_DETAIL_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

// ─── PATCH /api/users/[id] ────────────────────────────────────────────────
export const PATCH = withAuthGuard("user:create", async (req, { agencyId }, context) => {
  try {
    const { id } = await context.params;
    return await handleUserUpdate(req, agencyId, id);
  } catch (error) {
    console.error("[PATCH_USER_ERROR]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
});

// ─── PUT /api/users/[id] ──────────────────────────────────────────────────
export const PUT = withAuthGuard("user:create", async (req, { agencyId }, context) => {
  try {
    const { id } = await context.params;
    return await handleUserUpdate(req, agencyId, id);
  } catch (error) {
    console.error("[PUT_USER_ERROR]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
});

// ─── DELETE /api/users/[id] ───────────────────────────────────────────────
export const DELETE = withAuthGuard("user:create", async (req, { agencyId, userId }, context) => {
  try {
    const { id } = await context.params;

    if (id === userId) {
      return NextResponse.json({ error: "Self-termination forbidden" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const existingUser = await db.user.findFirst({
      where: { id, agencyId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Employee not found in your workspace" }, { status: 404 });
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Employee removed from agency successfully" });
  } catch (error) {
    console.error("[DELETE_USER_ERROR]", error);
    return NextResponse.json({ error: "Termination failed" }, { status: 500 });
  }
});