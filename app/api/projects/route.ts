import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const projects = await prisma.project.findMany({
      where: { agencyId },
      include: {
        client: true,
        tasks: {
          include: {
            taskExpenses: true 
          }
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("API_PROJECTS_GET_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { projectName, clientId, projectStory, cloudLink, tasks } = body;

    // --- 1. GENERATE AUTO PROJECT NUMBER ---
    // Count existing projects for THIS agency to create a sequence
    const projectCount = await prisma.project.count({
      where: { agencyId }
    });
    
    // Format: PRJ-001, PRJ-002, etc. (Padded to 3 digits)
    const projectNo = `PRJ-${(projectCount + 1).toString().padStart(3, '0')}`;

    // --- 2. CALCULATE TOTAL PROJECT VALUE ---
    const totalValue = tasks.reduce((projectSum: number, t: any) => {
      const taskRentals = (t.externalRentals || []).reduce(
        (expenseSum: number, exp: any) => expenseSum + (parseFloat(exp.cost) || 0), 
        0
      );

      const baseCost = (parseFloat(t.grossRevenue) || 0) + taskRentals;
      const marginMultiplier = (parseFloat(t.margin) || 0) / 100;
      const taskMarginAmount = baseCost * marginMultiplier;

      return projectSum + (baseCost + taskMarginAmount);
    }, 0);

    // --- 3. CALCULATE TARGET DEADLINE ---
    const targetDeadline = tasks.length > 0 
      ? new Date(Math.max(...tasks.map((t: any) => new Date(t.endDate).getTime())))
      : new Date();

    // --- 4. CREATE PROJECT ---
    const newProject = await prisma.project.create({
      data: {
        projectNo, // <--- Automated sequential number
        projectName,
        projectStory,
        cloudLink,
        status: "ACTIVE",
        totalValue, 
        targetDeadline,
        invoiceStatus: "DRAFT",
        
        agency: { connect: { id: agencyId } },
        client: { connect: { id: clientId } },

        tasks: {
          create: tasks.map((task: any) => ({
            taskType: task.taskType,
            status: "PENDING",
            internalCost: parseFloat(task.grossRevenue) || 0, 
            margin: parseFloat(task.margin) || 0,
            startDate: new Date(task.startDate),
            endDate: new Date(task.endDate),
            description: task.description,
            priority: task.priority || "MEDIUM",
            agency: { connect: { id: agencyId } },
            
            ...(task.assigneeId && {
              assignee: { connect: { id: task.assigneeId } }
            }),

            taskExpenses: {
              create: (task.externalRentals || []).map((exp: any) => ({
                itemName: exp.itemName,
                cost: parseFloat(exp.cost) || 0,
                category: exp.category || "RENTAL",
                agencyId: agencyId, 
              })),
            },

            assets: {
              connect: (task.assetIds || []).map((id: string) => ({ id }))
            },
          })),
        },
      },
      include: {
        tasks: {
          include: {
            taskExpenses: true
          }
        }
      }
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error("API_PROJECT_CREATE_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}