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
    const competitor = await db.discoveryCompetitor.create({
      data: {
        opportunityId,
        name: body.name,
        strengths: body.strengths,
        weaknesses: body.weaknesses,
        pricingNote: body.pricingNote,
        marketShare: body.marketShare,
      },
    });

    return NextResponse.json(competitor, { status: 201 });
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

    const competitor = await db.discoveryCompetitor.update({
      where: { id },
      data,
    });

    return NextResponse.json(competitor, { status: 200 });
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

    await db.discoveryCompetitor.delete({ where: { id } });

    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}