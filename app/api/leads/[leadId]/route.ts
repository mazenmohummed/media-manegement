// app/api/leads/[leadId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateLeadSchema } from "@/lib/validations/lead";
import { LeadStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const json = await req.json();

    // 1. Validate request body against Zod schema
    const validatedData = updateLeadSchema.parse(json);
    const { ownerId, agencyId, status, ...rest } = validatedData;

    // 2. Prevent direct status updates to CONVERTED via PATCH
    if (status === LeadStatus.CONVERTED) {
      return NextResponse.json(
        { error: "Use /api/leads/[leadId]/convert endpoint to convert leads." },
        { status: 400 }
      );
    }

    // 3. Perform lead update including relational updates for owner
    const updatedLead = await db.lead.update({
      where: { id: leadId },
      data: {
        ...rest,
        ...(status ? { status } : {}),
        ...(ownerId !== undefined
          ? ownerId
            ? { owner: { connect: { id: ownerId } } }
            : { owner: { disconnect: true } }
          : {}),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updatedLead });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    console.error("PATCH /api/leads/[leadId] Error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

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