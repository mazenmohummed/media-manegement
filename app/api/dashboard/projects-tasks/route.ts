import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agencyId = searchParams.get("agencyId");

  if (!agencyId) {
    return NextResponse.json({ error: "Missing agencyId context" }, { status: 400 });
  }

  try {
    const projects = await db.project.findMany({
      where: { agencyId },
      include: {
        client: { select: { clientName: true } },
        milestones: true,
        tasks: { select: { status: true, progress: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}