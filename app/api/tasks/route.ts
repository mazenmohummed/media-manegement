import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust this path based on your setup

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agencyId");

    if (!agencyId) {
      return NextResponse.json({ error: "Agency ID is required" }, { status: 400 });
    }

    // Match your Prisma schema relations exactly
    const tasks = await prisma.task.findMany({
      where: {
        agencyId: agencyId,
      },
      include: {
        project: {
          select: {
            projectName: true,
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Database query failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}