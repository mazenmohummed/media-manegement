// app/api/proposals/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// GET: List all proposals for the agency
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const proposals = await db.proposal.findMany({
      where: { agencyId: session.user.agencyId },
      include: {
        opportunity: { select: { id: true, name: true } },
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(proposals, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Error" }, { status: 500 });
  }
}

// POST: Create a new proposal linked to an opportunity
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { opportunityId, proposalNo, currency, validUntil, scope, risks, assumptions, paymentSchedule, lineItems } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: "Opportunity ID is required" }, { status: 400 });
    }

    // Verify opportunity belongs to agency
    const opportunity = await db.opportunity.findUnique({
      where: { id: opportunityId },
      select: { agencyId: true },
    });

    if (!opportunity || opportunity.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // Format and calculate line items totals if provided
    let formattedItems: any[] = [];
    let computedTotal = 0;

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      formattedItems = lineItems.map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unitPrice) || 0;
        const total = qty * price;
        computedTotal += total;
        return {
          description: item.description,
          quantity: qty,
          unitPrice: price,
          total,
        };
      });
    }

    const newProposal = await db.proposal.create({
      data: {
        opportunityId,
        agencyId: session.user.agencyId,
        proposalNo: proposalNo || null,
        currency: currency || "EGP",
        validUntil: validUntil ? new Date(validUntil) : null,
        scope: scope || null,
        risks: risks || null,
        assumptions: assumptions || null,
        paymentSchedule: paymentSchedule || null,
        totalAmount: computedTotal,
        lineItems: {
          create: formattedItems,
        },
      },
      include: { lineItems: true },
    });

    return NextResponse.json(newProposal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create proposal" }, { status: 500 });
  }
}