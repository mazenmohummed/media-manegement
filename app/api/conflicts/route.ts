import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Adjust this path to your prisma client
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { startDate, endDate, employeeIds = [], assetIds = [] } = await req.json();

    // 1. Convert strings to Date objects for Prisma
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Basic Validation
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ employees: [], assets: [] });
    }

    // 2. Query for any tasks that overlap this time range 
    // AND use any of the selected employees or assets
    const overlappingTasks = await prisma.task.findMany({
      where: {
        agencyId: session.user.agencyId,
        // Standard Overlap Logic: (TaskStart <= RequestEnd) AND (TaskEnd >= RequestStart)
        startDate: { lte: end },
        endDate: { gte: start },
        OR: [
          { assigneeIds: { hasSome: employeeIds } },
          { assetIds: { hasSome: assetIds } }
        ]
      },
      include: {
        assignees: { select: { id: true, name: true } },
        assets: { select: { id: true, assetName: true } }
      }
    });

    // 3. Extract the names of the specific people/items that are conflicting
    const conflictingEmployeeNames: string[] = [];
    const conflictingAssetNames: string[] = [];

    overlappingTasks.forEach(task => {
      // Check which employees from the request are in this specific task
      task.assignees.forEach(emp => {
        if (employeeIds.includes(emp.id)) {
          conflictingEmployeeNames.push(emp.name);
        }
      });

      // Check which assets from the request are in this specific task
      task.assets.forEach(asset => {
        if (assetIds.includes(asset.id)) {
          conflictingAssetNames.push(asset.assetName);
        }
      });
    });

    // 4. Return unique names
    return NextResponse.json({
      employees: [...new Set(conflictingEmployeeNames)],
      assets: [...new Set(conflictingAssetNames)]
    });

  } catch (error) {
    console.error("Conflict API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}