import { NextRequest, NextResponse } from "next/server";
import { getScopedPrisma } from "@/lib/prisma";
import { departmentSchema } from "@/lib/validations/department";

function getAgencyId(req: NextRequest): string | null {
  return req.headers.get("x-agency-id");
}

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/departments/[id] - Get single department details
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
      return NextResponse.json({ error: "Missing agency context" }, { status: 403 });
    }

    const { id } = await params;
    const db = getScopedPrisma(agencyId);

    const department = await db.department.findFirst({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error("[DEPARTMENT_GET_BY_ID]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/departments/[id] - Update department details
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
      return NextResponse.json({ error: "Missing agency context" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validation = departmentSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    // Check existence within tenant
    const existing = await db.department.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const updatedDepartment = await db.department.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(updatedDepartment);
  } catch (error) {
    console.error("[DEPARTMENT_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/departments/[id] - Delete department & unassign members
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
      return NextResponse.json({ error: "Missing agency context" }, { status: 403 });
    }

    const { id } = await params;
    const db = getScopedPrisma(agencyId);

    const existing = await db.department.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Unassign users from department before deletion (sets User.departmentId = null)
    await db.user.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });

    await db.department.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Department deleted" });
  } catch (error) {
    console.error("[DEPARTMENT_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}