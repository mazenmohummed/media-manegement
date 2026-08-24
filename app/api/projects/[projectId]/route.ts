import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { id: true, clientName: true, email: true } },
        contract: { select: { id: true, contractNo: true, status: true } },
        milestones: {
          select: { id: true, name: true, status: true, deadline: true, budget: true },
          orderBy: { order: "asc" },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assignees: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!project || project.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project, { status: 200 });
  } catch (error: any) {
    console.error("[PROJECT_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Error" },
      { status: 500 }
    );
  }
}