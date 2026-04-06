import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// Define an interface for the calculated data to satisfy TypeScript
interface TaskCalculation {
  taskType: string;
  internalCost: number;
  margin: number;
  marginAmount: number;
  taskTotalValue: number;
  taskNetProfit: number;
  realCost: number;
  userToUpdate: string | null;
  startDate: string | Date;
  endDate: string | Date;
  description?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  assigneeIds?: string[];
  externalRentals?: any[];
  todos?: { create: any[] };
}

// --- GET: Fetch all projects for the dashboard ---
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { agencyId: session.user.agencyId },
      include: {
        client: true,
        tasks: {
          include: {
            assignees: true,
            taskExpenses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("DASHBOARD_FETCH_ERROR:", error);
    return NextResponse.json({ error: "Failed to load ledger" }, { status: 500 });
  }
}



// --- POST: Create a new project ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { projectName, clientId, projectStory, cloudLink, tasks = [] } = body;

    const allAssigneeIds = tasks.flatMap((t: any) => t.assigneeIds || []);
    const uniqueAssigneeIds = [...new Set(allAssigneeIds)] as string[];
    const preFetchedUsers = await prisma.user.findMany({
      where: { id: { in: uniqueAssigneeIds } },
    });

    // Explicitly typing 'task' as any (from the request body) 
    // and returning our TaskCalculation interface
    const taskDataWithCalculations: TaskCalculation[] = tasks.map((task: any): TaskCalculation => {
      const internalCost = parseFloat(task.internalCost) || 0;
      const marginPercent = parseFloat(task.margin) || 0;

      const expenses = (task.externalRentals || []).reduce(
        (sum: number, e: any) => sum + (parseFloat(e.cost) || 0),
        0
      );

      const marginAmount = ((internalCost + expenses) * marginPercent) / 100;
      const taskTotalValue = internalCost + expenses + marginAmount;

      let taskNetProfit = 0;
      let realCost = 0; 

      const primaryId = task.assigneeIds?.[0];
      const user = preFetchedUsers.find((u) => u.id === primaryId);

      if (user) {
        if (user.userType === "FREELANCER") {
          realCost = expenses + internalCost;
          taskNetProfit = marginAmount;
        } else {
          realCost = expenses;
          taskNetProfit = taskTotalValue - expenses;
        }
      }

      return {
        ...task,
        internalCost,
        margin: marginPercent,
        marginAmount,
        taskTotalValue,
        taskNetProfit,
        realCost,
        userToUpdate: user?.userType === "FREELANCER" ? user.id : null,
      };
    });

    // Added type 'number' for acc and 'TaskCalculation' for t
    const totalProjectValue = taskDataWithCalculations.reduce(
      (acc: number, t: TaskCalculation) => acc + t.taskTotalValue, 
      0
    );

    const targetDeadline = tasks.length > 0
      ? new Date(Math.max(...tasks.map((t: any) => new Date(t.endDate).getTime())))
      : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const projectCount = await tx.project.count({ where: { agencyId } });
      const projectNo = `PRJ-${(projectCount + 1).toString().padStart(3, "0")}`;

      for (const t of taskDataWithCalculations) {
        if (t.userToUpdate) {
          await tx.user.update({
            where: { id: t.userToUpdate },
            data: { salary: { increment: t.internalCost } },
          });
        }
      }

      return await tx.project.create({
        data: {
          projectNo,
          projectName,
          projectStory,
          cloudLink,
          status: "ACTIVE",
          totalValue: totalProjectValue,
          targetDeadline,
          agency: { connect: { id: agencyId } },
          client: { connect: { id: clientId } },
          tasks: {
            // Explicitly typed 't' as TaskCalculation and 'index' as number
            create: taskDataWithCalculations.map((t: TaskCalculation, index: number) => ({
              taskNo: `${projectNo}-T${(index + 1).toString().padStart(2, "0")}`,
              taskType: t.taskType,
              status: "PENDING",
              internalCost: t.internalCost,
              margin: t.margin,
              marginAmount: t.marginAmount,
              taskNetProfit: t.taskNetProfit,
              totalValue: t.taskTotalValue,
              startDate: new Date(t.startDate),
              endDate: new Date(t.endDate),
              description: t.description,
              realCost: t.realCost,
              latitude: t.latitude ?? null,
              longitude: t.longitude ?? null,
              locationName: t.locationName || null,
              agency: { connect: { id: agencyId } },
              assignees: t.assigneeIds && t.assigneeIds.length > 0
                ? { connect: t.assigneeIds.map((id: string) => ({ id })) }
                : undefined,
              taskExpenses: {
                create: (t.externalRentals || []).map((exp: any) => ({
                  itemName: exp.itemName,
                  cost: parseFloat(exp.cost) || 0,
                  category: exp.category || "RENTAL",
                  agency: { connect: { id: agencyId } },
                })),
              },
              todos: t.todos?.create ? { create: t.todos.create } : undefined
            })),
          },
        },
        include: {
          tasks: {
            include: { taskExpenses: true, assignees: true },
          },
        },
      });
    }, {
      maxWait: 5000,
      timeout: 20000,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}