import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get("agencyId");

    if (!agencyId) {
      return NextResponse.json({ error: "Agency ID required" }, { status: 400 });
    }

    const tasks = await prisma.task.findMany({
      where: {
        project: { agencyId: agencyId }
      },
      include: {
        project: true,
        assignee: true,
        assets: true,
        externalRentals: true
      },
      orderBy: { lastUpdateTimestamp: 'desc' }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("FETCH_TASKS_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, progress, description, startDate, endDate } = body;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status,
        progress: parseInt(progress),
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("UPDATE_TASK_ERROR:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}