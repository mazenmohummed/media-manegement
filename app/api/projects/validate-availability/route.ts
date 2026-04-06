import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// ... existing imports

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) return new NextResponse("Unauthorized", { status: 401 });

    // Explicitly type the incoming request body
    const body: { 
      startDate: string; 
      endDate: string; 
      employeeIds?: string[]; 
      assetIds?: string[] 
    } = await req.json();

    const { startDate, endDate, employeeIds = [], assetIds = [] } = body;
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ employees: [], assets: [] });
    }

    const overlappingTasks = await prisma.task.findMany({
  where: {
    agencyId: session.user.agencyId,
    startDate: { lte: end },
    endDate: { gte: start },
    OR: [
      { assigneeIds: { hasSome: employeeIds } },
      { assetIds: { hasSome: assetIds } }
    ]
  },
  select: {
    assigneeIds: true,
    assetIds: true,
    assignees: { select: { id: true, name: true } },
    assets: { select: { id: true, assetName: true } }
  }
});

    const conflicts = {
      employees: [] as string[],
      assets: [] as string[]
    };

    overlappingTasks.forEach(task => {
      // Fixed: Explicitly typed 'id' as string in filter
      const taskEmployeeIds = task.assigneeIds || [];
      const employeeConflict = employeeIds.filter((id: string) => taskEmployeeIds.includes(id));
      
      if (employeeConflict.length > 0) {
        task.assignees.forEach(emp => {
          if (employeeConflict.includes(emp.id)) conflicts.employees.push(emp.name);
        });
      }

      // Fixed: Explicitly typed 'id' as string in filter
      const taskAssetIds = task.assetIds || [];
      const assetConflict = assetIds.filter((id: string) => taskAssetIds.includes(id));

      if (assetConflict.length > 0) {
        task.assets.forEach(asset => {
          if (assetConflict.includes(asset.id)) conflicts.assets.push(asset.assetName);
        });
      }
    });

    return NextResponse.json({
      employees: [...new Set(conflicts.employees)],
      assets: [...new Set(conflicts.assets)]
    });

  } catch (error) {
    console.error("Conflict Validation Error:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}