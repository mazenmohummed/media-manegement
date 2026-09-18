// app/api/milestones/[milestoneId]/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> } // ✅ Promise
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Await params before accessing
  const { milestoneId } = await params;

  const tasks = await db.task.findMany({
    where: {
      milestoneId,
      agencyId: session.user.agencyId,
      deletedAt: null,
    },
    include: {
      assignees: { select: { id: true, name: true, avatarUrl: true } },
      category: { select: { id: true, name: true } },
      _count: { select: { comments: true, todos: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}