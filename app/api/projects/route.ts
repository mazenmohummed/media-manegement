import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

interface TaskCalculation {
  taskType: string;
  internalCost: number;
  margin: number;
  marginAmount: number;
  taskTotalValue: number;
  taskNetProfit: number;
  realCost: number;
  freelancerUpdates: { id: string; amount: number }[]; // Track all freelancers in a task
  startDate: string | Date;
  endDate: string | Date;
  description?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  assigneeIds: string[]; 
  externalRentals?: any[];
  todos?: { create: any[] };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { agencyId: agencyId },
      include: {
        client: { select: { clientName: true } },
        tasks: {
          select: {
           id: true,
          status: true,
          progress: true,
          taskNetProfit: true, // IMPORTANT
          totalInvoice: true,  // IMPORTANT
          realCost: true,
                },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("PROJECTS_GET_ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { projectName, clientId, projectStory, cloudLink, tasks = [] } = body;

    // 1. Pre-fetch users to identify Freelancers for realCost calculation
    const flatUserIds = tasks.flatMap((t: any) => 
      (t.assigneeIds || []).map((a: any) => typeof a === 'string' ? a : a.id)
    );
    const uniqueIds = [...new Set(flatUserIds)] as string[];
    
    const preFetchedUsers = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, userType: true }
    });

    // 2. Map tasks with your specific agency owner formulas
    const taskDataWithCalculations = tasks.map((task: any) => {
      const taskAssignees = task.assigneeIds || [];
      let totalNegotiatedFreelancerPay = 0;
      const freelancerUpdates: { id: string, amount: number }[] = [];

      taskAssignees.forEach((assigneeObj: any) => {
        const id = typeof assigneeObj === 'string' ? assigneeObj : assigneeObj.id;
        const salary = parseFloat(assigneeObj.salary) || 0;
        const user = preFetchedUsers.find((u) => u.id === id);
        
        if (user?.userType === "FREELANCER") {
          totalNegotiatedFreelancerPay += salary;
          freelancerUpdates.push({ id, amount: salary });
        }
      });

      const internalCost = parseFloat(task.internalCost) || 0;
      const marginPercent = parseFloat(task.margin) || 0;
      
      // Calculate expenses from the TaskExpense objects (actual external costs)
      const expenses = (task.externalRentals || []).reduce(
        (sum: number, e: any) => sum + (parseFloat(e.cost) || 0),
        0
      );

      // --- YOUR FINANCIAL FORMULAS ---
      // 1. marginAmount = (internalCost * margin) / 100
      const marginAmount = (internalCost * marginPercent) / 100;
      
      // 2. totalInvoice = internalCost + marginAmount
      const totalInvoice = internalCost + marginAmount;
      
      // 3. realCost = freelancer salary + expenses
      const realCost = totalNegotiatedFreelancerPay + expenses;
      
      // 4. taskNetProfit = totalInvoice - realCost
      const taskNetProfit = totalInvoice - realCost; 

      return {
        ...task,
        internalCost,
        margin: marginPercent,
        marginAmount,
        totalInvoice,
        taskNetProfit,
        realCost,
        assigneeIds: taskAssignees.map((a: any) => typeof a === 'string' ? a : a.id),
        freelancerUpdates
      };
    });

    // Project Total is now the sum of all Task Invoices
    const projectTotalInvoice = taskDataWithCalculations.reduce(
      (acc: number, t: any) => acc + t.totalInvoice, 0
    );

    const targetDeadline = tasks.length > 0
      ? new Date(Math.max(...tasks.map((t: any) => new Date(t.endDate).getTime())))
      : new Date();

    // 3. Database Transaction
    const result = await prisma.$transaction(async (tx) => {
  const projectCount = await tx.project.count({ where: { agencyId } });
  const projectNo = `PRJ-${(projectCount + 1).toString().padStart(3, "0")}`;

  // Update Freelancer Balances
  for (const t of taskDataWithCalculations) {
    for (const update of t.freelancerUpdates) {
      await tx.user.update({
        where: { id: update.id },
        data: { salary: { increment: update.amount } },
      });
    }
  }

// STEP 1: Create project + tasks WITHOUT taskExpenses
    const project = await tx.project.create({
      data: {
        projectNo,
        projectName,
        projectStory,
        cloudLink,
        status: "ACTIVE",
        totalValue: projectTotalInvoice,
        targetDeadline,
        agency: { connect: { id: agencyId } },
        client: { connect: { id: clientId } },
        tasks: {
          create: taskDataWithCalculations.map((t: any, index: number) => ({
            taskNo: `${projectNo}-T${(index + 1).toString().padStart(2, "0")}`,
            taskType: t.taskType,
            status: "PENDING",
            internalCost: t.internalCost,
            margin: t.margin,
            marginAmount: t.marginAmount,
            totalInvoice: t.totalInvoice,
            taskNetProfit: t.taskNetProfit,
            realCost: t.realCost,
            startDate: new Date(t.startDate),
            endDate: new Date(t.endDate),
            description: t.description,
            latitude: t.latitude ?? null,
            longitude: t.longitude ?? null,
            locationName: t.locationName || null,
            agency: { connect: { id: agencyId } },
            
            // 1. CONNECT ASSIGNEES (Already here)
            assignees: {
              connect: t.assigneeIds.map((id: string) => ({ id }))
            },

            // 2. ADD THIS: CONNECT ASSETS AUTOMATICALLY TO MULTI-TENANT ARRAY
            // Ensures that task.assetIds and asset.taskIds sync instantly in MongoDB
            assets: t.assetIds && t.assetIds.length > 0 ? {
              connect: t.assetIds.map((id: string) => ({ id }))
            } : undefined,

            todos: t.todos?.create ? { create: t.todos.create } : undefined
          })),
        },
      },
      include: { tasks: true }, // Get task IDs for step 2
    });

  // STEP 2: Now create TaskExpenses with real project + task IDs
  for (let i = 0; i < taskDataWithCalculations.length; i++) {
    const t = taskDataWithCalculations[i];
    const createdTask = project.tasks[i];

    if (t.externalRentals && t.externalRentals.length > 0) {
      await tx.taskExpense.createMany({
        data: t.externalRentals.map((exp: any) => ({
          itemName: exp.itemName,
          cost: parseFloat(exp.cost) || 0,
          category: exp.category || "EQUIPMENT",
          taskId: createdTask.id,
          projectId: project.id,
          agencyId: agencyId,
        })),
      });
    }
  }

  // STEP 3: Return the full project with everything included
  return await tx.project.findUnique({
    where: { id: project.id },
    include: {
      tasks: {
        include: { taskExpenses: true, assignees: true },
      },
    },
  });
}, {
  maxWait: 10000,
  timeout: 30000,
});

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

