// app/api/opportunities/[opportunityId]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ opportunityId: string }>;
}

const OPPORTUNITY_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  user: { select: { id: true, name: true, email: true, role: true } }, // Assigned Employee
  lead: {
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  },
  client: { select: { id: true, clientName: true, email: true, clientNo: true } },
  personas: true,
  competitors: true,
  products: true,
} as const;

// GET: Fetch a single opportunity with nested discovery context and client relation
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Unauthorized agency context" },
        { status: 401 }
      );
    }

    const { opportunityId } = await params;

    const opportunity = await db.opportunity.findFirst({
      where: {
        id: opportunityId,
        agencyId,
      },
      include: {
        ...OPPORTUNITY_INCLUDE,
        proposals: {
          select: {
            id: true,
            proposalNo: true,
            status: true,
            totalAmount: true,
            currency: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(opportunity, { status: 200 });
  } catch (error: any) {
    console.error("[OPPORTUNITY_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH: Update opportunity details & strategic fields including clientId, ownerId, userId
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Unauthorized agency context" },
        { status: 401 }
      );
    }

    const { opportunityId } = await params;
    const body = await request.json();

    // 1. Verify the opportunity exists and belongs to the active agency tenant
    const existingOpportunity = await db.opportunity.findFirst({
      where: {
        id: opportunityId,
        agencyId,
      },
      select: { id: true },
    });

    if (!existingOpportunity) {
      return NextResponse.json(
        { error: "Opportunity not found or access denied" },
        { status: 404 }
      );
    }

    const {
      name,
      stage,
      budget,
      currency,
      expectedCloseDate,
      ownerId, // deal owner (OpportunityOwner relation)
      userId, // assigned employee (UserOpportunities relation)
      clientId, // linked client, nullable via Client? relation with onDelete: SetNull
      companyMission,
      brandValues,
      marketResearchNotes,
      marketingStrategy,
      communicationStrategy,
      mediaStrategy,
      creativeStrategy,
      launchStrategy,
      kpis,
    } = body;

    // 2. If a clientId is being set, confirm it belongs to this agency tenant too
    if (clientId) {
      const client = await db.client.findFirst({
        where: { id: clientId, agencyId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json(
          { error: "Client not found or access denied" },
          { status: 404 }
        );
      }
    }

    // 3. If an ownerId is being set, confirm it belongs to this agency tenant too
    if (ownerId) {
      const owner = await db.user.findFirst({
        where: { id: ownerId, agencyId },
        select: { id: true },
      });
      if (!owner) {
        return NextResponse.json(
          { error: "Owner not found or access denied" },
          { status: 404 }
        );
      }
    }

    // 4. If a userId (assigned employee) is being set, confirm it belongs to this agency tenant too
    if (userId) {
      const assignedUser = await db.user.findFirst({
        where: { id: userId, agencyId },
        select: { id: true },
      });
      if (!assignedUser) {
        return NextResponse.json(
          { error: "Assigned employee not found or access denied" },
          { status: 404 }
        );
      }
    }

    // 5. Update Opportunity table fields directly, including client/owner/assignee binding
    const updatedOpportunity = await db.opportunity.update({
      where: { id: opportunityId },
      data: {
        ...(name !== undefined && { name }),
        ...(stage !== undefined && { stage }),
        ...(budget !== undefined && { budget }),
        ...(currency !== undefined && { currency }),
        ...(ownerId !== undefined && { ownerId }),
        ...(userId !== undefined && { userId }),
        ...(clientId !== undefined && { clientId }),
        ...(expectedCloseDate !== undefined && {
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        }),
        ...(companyMission !== undefined && { companyMission }),
        ...(brandValues !== undefined && { brandValues }),
        ...(marketResearchNotes !== undefined && { marketResearchNotes }),
        ...(marketingStrategy !== undefined && { marketingStrategy }),
        ...(communicationStrategy !== undefined && { communicationStrategy }),
        ...(mediaStrategy !== undefined && { mediaStrategy }),
        ...(creativeStrategy !== undefined && { creativeStrategy }),
        ...(launchStrategy !== undefined && { launchStrategy }),
        ...(Array.isArray(kpis) && { kpis }),
      },
      include: OPPORTUNITY_INCLUDE,
    });

    return NextResponse.json(updatedOpportunity, { status: 200 });
  } catch (error: any) {
    console.error("[OPPORTUNITY_PATCH_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update opportunity" },
      { status: 500 }
    );
  }
}

// DELETE: Remove an opportunity scoped to agency tenant
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Unauthorized agency context" },
        { status: 401 }
      );
    }

    const { opportunityId } = await params;

    const existingOpportunity = await db.opportunity.findFirst({
      where: {
        id: opportunityId,
        agencyId,
      },
      include: {
        proposals: { select: { id: true } },
      },
    });

    if (!existingOpportunity) {
      return NextResponse.json(
        { error: "Opportunity not found or access denied" },
        { status: 404 }
      );
    }

    // Guard rail: opportunities with existing proposals shouldn't be silently
    // deleted, since Proposal.opportunityId has no default-null path and the
    // relation cascades. Block the delete and point the caller at the proposals
    // that need to be handled first.
    if (existingOpportunity.proposals.length > 0) {
      return NextResponse.json(
        {
          error:
            "This opportunity has proposals attached. Delete or reassign those proposals before deleting the opportunity.",
          proposalIds: existingOpportunity.proposals.map((p) => p.id),
        },
        { status: 409 }
      );
    }

    // personas, competitors, and products cascade automatically via onDelete: Cascade
    await db.opportunity.delete({
      where: { id: opportunityId },
    });

    return NextResponse.json(
      { message: "Opportunity deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[OPPORTUNITY_DELETE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}