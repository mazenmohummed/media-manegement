// app/api/leads/[leadId]/convert/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LeadStatus, OpportunityStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    const { leadId } = await params;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Unauthorized agency context" },
        { status: 401 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Fetch Lead scoped to agency
      const lead = await tx.lead.findFirst({
        where: {
          id: leadId,
          agencyId,
          deletedAt: null,
        },
      });

      if (!lead) throw new Error("LEAD_NOT_FOUND");
      if (lead.status === LeadStatus.CONVERTED) throw new Error("ALREADY_CONVERTED");
      if (lead.status === LeadStatus.DISQUALIFIED) throw new Error("CANNOT_CONVERT_DISQUALIFIED");

      // 2. Prevent duplicate opportunity
      const existingOpp = await tx.opportunity.findUnique({
        where: { leadId },
      });
      if (existingOpp) throw new Error("OPPORTUNITY_ALREADY_EXISTS");

      // 3. Create Opportunity aligned with new schema
      const opportunity = await tx.opportunity.create({
        data: {
          leadId: lead.id,
          agencyId: lead.agencyId,
          name: `${lead.companyName} - Opportunity`,
          budget: lead.estimatedBudget,
          currency: lead.currency ?? "EGP",
          stage: OpportunityStage.QUALIFICATION,
          expectedCloseDate: lead.expectedCloseDate,
          marketResearchNotes: lead.notes,
          userId: lead.ownerId, // assigned employee carries over from lead
        },
      });

      // 4. Update Lead status
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAt: new Date(),
        },
      });

      return { opportunity, lead: updatedLead };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    const message = error?.message;

    if (message === "LEAD_NOT_FOUND") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (message === "ALREADY_CONVERTED" || message === "OPPORTUNITY_ALREADY_EXISTS") {
      return NextResponse.json(
        { error: "This lead has already been converted to an opportunity." },
        { status: 400 }
      );
    }
    if (message === "CANNOT_CONVERT_DISQUALIFIED") {
      return NextResponse.json(
        { error: "Disqualified leads cannot be converted." },
        { status: 400 }
      );
    }

    console.error("[LEAD_CONVERT_ERROR]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}