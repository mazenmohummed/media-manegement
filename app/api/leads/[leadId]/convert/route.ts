// app/api/leads/[leadId]/convert/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LeadStatus, OpportunityStage } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const agencyId = req.headers.get("x-agency-id");

    const body = await req.json().catch(() => ({}));
    const { name, value, expectedCloseDate } = body;

    const result = await db.$transaction(async (tx) => {
      // 1. Fetch Lead
      const lead = await tx.lead.findFirst({
        where: {
          id: leadId,
          ...(agencyId ? { agencyId } : {}),
          deletedAt: null,
        },
      });

      if (!lead) {
        throw new Error("LEAD_NOT_FOUND");
      }

      if (lead.status === LeadStatus.CONVERTED) {
        throw new Error("ALREADY_CONVERTED");
      }

      if (lead.status === LeadStatus.DISQUALIFIED) {
        throw new Error("CANNOT_CONVERT_DISQUALIFIED");
      }

      // 2. Prevent duplicate opportunity creation
      const existingOpp = await tx.opportunity.findUnique({
        where: { leadId },
      });

      if (existingOpp) {
        throw new Error("OPPORTUNITY_ALREADY_EXISTS");
      }

      // 3. Create Opportunity
      const opportunity = await tx.opportunity.create({
        data: {
          leadId: lead.id,
          agencyId: lead.agencyId,
          name: name || `${lead.companyName} - Deal`,
          budget: value ?? lead.estimatedBudget ?? 0,
          currency: lead.currency ?? "EGP",
          stage: OpportunityStage.QUALIFICATION,
          marketingStrategy: lead.notes,
        },
      });

      // 4. Update Lead status to CONVERTED
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

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}