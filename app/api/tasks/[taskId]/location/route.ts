// app/api/tasks/[taskId]/location/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();
    const { locationName, latitude, longitude, radius } = body;

    // Validate the task belongs to the agency
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId: session.user.agencyId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Validate coordinates if provided
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return NextResponse.json(
        { error: "Latitude must be between -90 and 90" },
        { status: 400 }
      );
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return NextResponse.json(
        { error: "Longitude must be between -180 and 180" },
        { status: 400 }
      );
    }

    if (radius !== undefined && radius < 0) {
      return NextResponse.json(
        { error: "Radius must be a positive number" },
        { status: 400 }
      );
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        locationName: locationName ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        radius: radius ?? 200,
      },
      select: {
        id: true,
        title: true,
        locationName: true,
        latitude: true,
        longitude: true,
        radius: true,
      },
    });

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error: any) {
    console.error("[TASK_LOCATION_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update task location" },
      { status: 500 }
    );
  }
}

// GET: Get task location
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId: session.user.agencyId,
      },
      select: {
        id: true,
        title: true,
        locationName: true,
        latitude: true,
        longitude: true,
        radius: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error("[TASK_LOCATION_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch task location" },
      { status: 500 }
    );
  }
}