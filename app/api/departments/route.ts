import { NextRequest, NextResponse } from "next/server";
import { getScopedPrisma } from "@/lib/prisma";
import { departmentSchema } from "@/lib/validations/department";

// Helper to resolve agencyId from headers or session
function getAgencyId(req: NextRequest): string | null {
  return req.headers.get("x-agency-id");
}

/**
 * GET /api/departments - List all departments for the tenant
 */
export async function GET(req: NextRequest) {
  try {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
      return NextResponse.json({ error: "Missing agency context" }, { status: 403 });
    }

    const db = getScopedPrisma(agencyId);

    const departments = await db.department.findMany({
      include: {
        _count: {
          select: { users: true }, // Returns member count per department
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("[DEPARTMENTS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/departments - Create a new department
 */
export async function POST(req: NextRequest) {
  try {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
      return NextResponse.json({ error: "Missing agency context" }, { status: 403 });
    }

    const body = await req.json();
    const validation = departmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    // Check for duplicate department name within this agency
    const existing = await db.department.findFirst({
      where: { name: validation.data.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 409 }
      );
    }

    // agencyId is injected automatically by getScopedPrisma
    const department = await db.department.create({
      data: {
        name: validation.data.name,
        description: validation.data.description,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("[DEPARTMENTS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}