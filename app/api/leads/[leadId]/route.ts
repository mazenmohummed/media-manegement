// app/api/leads/[leadId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateLeadSchema } from "@/lib/validations/lead";
import { LeadStatus, OpportunityStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;

    // Soft delete implementation using deletedAt field
    await db.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Lead soft-deleted successfully",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    console.error("DELETE /api/leads/[leadId] Error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}



interface RouteParams {
  params: Promise<{ leadId: string }>;
}

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

    const { leadId } = await params;
    const body = await request.json();
    const { status, ...rest } = body;

    // ── AUTO-CONVERT: when status is changed to CONVERTED ──
    if (status === LeadStatus.CONVERTED) {
      const result = await db.$transaction(async (tx) => {
        const lead = await tx.lead.findFirst({
          where: { id: leadId, agencyId, deletedAt: null },
        });

        if (!lead) throw new Error("LEAD_NOT_FOUND");
        if (lead.status === LeadStatus.CONVERTED) throw new Error("ALREADY_CONVERTED");
        if (lead.status === LeadStatus.DISQUALIFIED) throw new Error("CANNOT_CONVERT_DISQUALIFIED");

        const existingOpp = await tx.opportunity.findUnique({
          where: { leadId },
        });
        if (existingOpp) throw new Error("OPPORTUNITY_ALREADY_EXISTS");

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
            userId: lead.ownerId, // assigned employee carries over
          },
        });

        const updatedLead = await tx.lead.update({
          where: { id: leadId },
          data: {
            ...rest,
            status: LeadStatus.CONVERTED,
            convertedAt: new Date(),
          },
        });

        return { opportunity, lead: updatedLead };
      });

      return NextResponse.json(
        { success: true, data: result },
        { status: 200 }
      );
    }

    // ── Normal update (no conversion) ──
    const updatedLead = await db.lead.update({
      where: { id: leadId, agencyId },
      data: {
        ...rest,
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json(updatedLead, { status: 200 });
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

    console.error("[LEAD_PATCH_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update lead" },
      { status: 500 }
    );
  }
}