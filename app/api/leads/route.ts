// app/api/leads/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { createLeadSchema } from "@/lib/validations/lead";

const ELIGIBLE_EMPLOYEE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.OPERATOR,
  UserRole.TEAMLEADER,
  UserRole.CREATIVE,
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get("agencyId");
    const status = searchParams.get("status");

    if (!agencyId) {
      return NextResponse.json(
        { error: "Agency ID is required" },
        { status: 400 }
      );
    }

    const leads = await db.lead.findMany({
      where: {
        agencyId,
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        agency: { select: { id: true, agencyName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: leads });
  } catch (error) {
    console.error("[GET /api/leads Error]:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = createLeadSchema.parse(json);

    // Validate assigned employee role if provided
    if (body.ownerId) {
      const user = await db.user.findFirst({
        where: { id: body.ownerId, agencyId: body.agencyId },
        select: { id: true, role: true },
      });
      if (!user) {
        return NextResponse.json(
          { error: "Assigned employee not found or access denied." },
          { status: 404 }
        );
      }
      if (!ELIGIBLE_EMPLOYEE_ROLES.includes(user.role)) {
        return NextResponse.json(
          {
            error: `User role '${user.role}' is not eligible for lead assignment.`,
          },
          { status: 403 }
        );
      }
    }

    const lead = await db.lead.create({
      data: {
        leadNo: body.leadNo,
        companyName: body.companyName,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        industry: body.industry,
        estimatedBudget: body.estimatedBudget,
        currency: body.currency,
        expectedCloseDate: body.expectedCloseDate,
        source: body.source,
        status: body.status,
        notes: body.notes,
        agency: { connect: { id: body.agencyId } },
        ...(body.ownerId ? { owner: { connect: { id: body.ownerId } } } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[POST /api/leads Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create lead" },
      { status: 500 }
    );
  }
}