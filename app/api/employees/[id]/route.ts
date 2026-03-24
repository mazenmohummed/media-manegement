import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  // Ensure the type reflects that params is a Promise
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // 1. Await the params to extract the ID
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            project: true,
          },
        },
        attendanceLogs: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // 2. Format the response
  const formattedData = {
  name: employee.name,
  role: employee.role,
  userType: employee.userType || "FULL_TIME", // Added this
  email: employee.email, // Added this to prevent 'undefined' in contact registry
  verifiedSkills: employee.verifiedSkills || [],
  efficiencyRate: employee.efficiencyRate || 0,
  // Keep these names consistent with your frontend loops
  tasks: employee.tasks.map((task) => ({
    id: task.id,
    project: { projectName: task.project?.projectName || "Internal Task" },
    taskType: (task.taskType || "GENERAL").replace('_', ' '),
    progress: 100, // Or whatever logic you use for progress
    grossRevenue: task.grossRevenue,
  })),
  attendanceLogs: employee.attendanceLogs.map((log) => ({
    id: log.id,
    status: log.status,
    date: log.date,
  })),
};

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}