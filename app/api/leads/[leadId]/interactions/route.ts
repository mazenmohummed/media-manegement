// app/api/leads/[leadId]/interactions/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { InteractionType } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  const headerList = await headers();
  const agencyId = headerList.get("x-agency-id");

  if (!agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const interactions = await db.leadInteraction.findMany({
    where: { leadId, agencyId },
    orderBy: { occurredAt: "desc" },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  return NextResponse.json(interactions);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  const headerList = await headers();
  const agencyId = headerList.get("x-agency-id");
  const userId = headerList.get("x-user-id");

  if (!agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, summary, occurredAt } = body;

    if (!type || !summary) {
      return NextResponse.json(
        { error: "Type and summary are required." },
        { status: 400 }
      );
    }

    const interaction = await db.leadInteraction.create({
      data: {
        type: type as InteractionType,
        summary,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        leadId,
        agencyId,
        createdById: userId || null,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to log interaction." },
      { status: 500 }
    );
  }
}