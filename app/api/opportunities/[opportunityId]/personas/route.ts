import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ opportunityId: string }>;
}

async function verifyAccess(opportunityId: string, agencyId: string) {
  return await db.opportunity.findFirst({
    where: { id: opportunityId, agencyId },
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { opportunityId } = await params;
    if (!(await verifyAccess(opportunityId, agencyId))) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const body = await request.json();
    const persona = await db.discoveryPersona.create({
      data: {
        opportunityId,
        name: body.name,
        goals: body.goals,
        frustrations: body.frustrations,
        demographics: body.demographics,
        psychographics: body.psychographics,
        buyingBehavior: body.buyingBehavior,
      },
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { opportunityId } = await params;
    if (!(await verifyAccess(opportunityId, agencyId))) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    const persona = await db.discoveryPersona.update({
      where: { id },
      data,
    });

    return NextResponse.json(persona, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { opportunityId } = await params;
    if (!(await verifyAccess(opportunityId, agencyId))) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await db.discoveryPersona.delete({ where: { id } });

    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}