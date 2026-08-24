import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const milestones = await db.milestone.findMany({
    where: {
      projectId,
      agencyId: session.user.agencyId,
    },
    select: {
      id: true,
      name: true,
      order: true,
      status: true,
      deadline: true,
      budget: true,
      tasks: {
        select: {
          id: true,
          status: true,
          progress: true,
        },
      },
    },
    orderBy: { order: "asc" },
  });

  // Compute progress rollup for each milestone
  const milestonesWithProgress = milestones.map((m) => {
    const totalTasks = m.tasks.length;
    const progress =
      totalTasks > 0
        ? Math.round(
            m.tasks.reduce((sum, task) => sum + (task.progress || (task.status === "COMPLETED" ? 100 : 0)), 0) /
              totalTasks
          )
        : 0;

    return {
      ...m,
      totalTasks,
      progress,
    };
  });

  return NextResponse.json({ milestones: milestonesWithProgress });
}