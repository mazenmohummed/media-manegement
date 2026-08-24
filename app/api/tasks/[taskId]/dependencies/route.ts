import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.dependsOnId) {
      return NextResponse.json({ error: "dependsOnId is required" }, { status: 400 });
    }

    // Prevent self-dependency and circular dependencies (basic check)
    if (body.dependsOnId === params.taskId) {
      return NextResponse.json({ error: "Cannot depend on itself" }, { status: 400 });
    }

    const task = await db.task.update({
      where: { id: params.taskId, agencyId: session.user.agencyId },
      data: {
        dependsOn: { connect: { id: body.dependsOnId } },
      },
    });

    return NextResponse.json(task);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dependsOnId = searchParams.get("dependsOnId");
    if (!dependsOnId) {
      return NextResponse.json({ error: "dependsOnId is required" }, { status: 400 });
    }

    const task = await db.task.update({
      where: { id: params.taskId, agencyId: session.user.agencyId },
      data: {
        dependsOn: { disconnect: { id: dependsOnId } },
      },
    });

    return NextResponse.json(task);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}