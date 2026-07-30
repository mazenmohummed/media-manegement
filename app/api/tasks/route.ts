import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions"; // Adjust path to your NextAuth options
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: {
        agencyId: session.user.agencyId,
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