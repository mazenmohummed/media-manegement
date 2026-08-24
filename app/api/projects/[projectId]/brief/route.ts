// app/api/projects/[projectId]/brief/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const brief = await db.creativeBrief.findUnique({
      where: { projectId },
      include: {
        project: {
          select: { name: true, projectName: true, currency: true, totalValue: true },
        },
      },
    });

    if (!brief) {
      return NextResponse.json(
        { success: false, error: "Creative brief not found for this project." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, brief });
  } catch (error) {
    console.error("Failed to fetch creative brief:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    const { title, status, budget, objectives, audience, keyMessage, deliverables, references } = body;

    const updatedBrief = await db.creativeBrief.update({
      where: { projectId },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
        ...(objectives !== undefined && { objectives }),
        ...(audience !== undefined && { audience }),
        ...(keyMessage !== undefined && { keyMessage }),
        ...(deliverables !== undefined && { deliverables }),
        ...(references !== undefined && { references }),
      },
    });

    return NextResponse.json({ success: true, brief: updatedBrief });
  } catch (error) {
    console.error("Failed to update creative brief:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update creative brief." },
      { status: 500 }
    );
  }
}