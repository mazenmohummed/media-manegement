import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createLeadSchema } from "@/lib/validations/lead";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get("agencyId");
    const status = searchParams.get("status");

    if (!agencyId) {
      return NextResponse.json({ error: "Agency ID is required" }, { status: 400 });
    }

    const leads = await db.lead.findMany({
      where: {
        agencyId,
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        agency: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: leads });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = createLeadSchema.parse(json);

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
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}