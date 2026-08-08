import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ proposalId: string }>;
}

// GET: Fetch a single proposal with its line items
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await params;

    const proposal = await db.proposal.findUnique({
      where: { id: proposalId },
      include: {
        lineItems: true,
        opportunity: { select: { id: true, name: true, agencyId: true } },
      },
    });

    if (!proposal || proposal.opportunity.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json(proposal, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Error" }, { status: 500 });
  }
}

// PATCH: Update proposal metadata & sync line items with auto-computed totalAmount
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await params;
    const body = await request.json();
    const { scope, risks, assumptions, paymentSchedule, status, currency, lineItems, validUntil } = body;

    // Verify tenant access via opportunity relation
    const existing = await db.proposal.findUnique({
      where: { id: proposalId },
      include: { opportunity: { select: { agencyId: true } } },
    });

    if (!existing || existing.opportunity.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Handle full line item synchronization if provided
    let lineItemsOperation = {};
    let computedTotal = existing.totalAmount;

    if (Array.isArray(lineItems)) {
      // Calculate individual totals and overall sum
      const formattedItems = lineItems.map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return {
          description: item.description,
          quantity: qty,
          unitPrice: price,
          total: qty * price,
        };
      });

      computedTotal = formattedItems.reduce((acc, curr) => acc + curr.total, 0);

      lineItemsOperation = {
        deleteMany: {}, // Clear old items and recreate
        create: formattedItems,
      };
    }

    const updatedProposal = await db.proposal.update({
      where: { id: proposalId },
      data: {
        ...(scope !== undefined && { scope }),
        ...(risks !== undefined && { risks }),
        ...(assumptions !== undefined && { assumptions }),
        ...(paymentSchedule !== undefined && { paymentSchedule }),
        ...(status !== undefined && { status }),
        ...(currency !== undefined && { currency }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        totalAmount: computedTotal,
        ...(Array.isArray(lineItems) && { lineItems: lineItemsOperation }),
      },
      include: { lineItems: true },
    });

    return NextResponse.json(updatedProposal, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update proposal" }, { status: 500 });
  }
}

// DELETE: Remove proposal
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await params;
    const existing = await db.proposal.findUnique({
      where: { id: proposalId },
      include: { opportunity: { select: { agencyId: true } } },
    });

    if (!existing || existing.opportunity.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    await db.proposal.delete({ where: { id: proposalId } });

    return NextResponse.json({ message: "Proposal deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Error" }, { status: 500 });
  }
}