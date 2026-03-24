import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectName, clientId, projectStory, cloudLink, tasks, agencyId } = body;

    const totalValue = tasks.reduce(
      (sum: number, t: any) => sum + (parseFloat(t.grossRevenue) || 0), 
      0
    );

    const newProject = await prisma.project.create({
      data: {
        projectName,
        projectStory,
        cloudLink,
        status: "ACTIVE",
        targetDeadline: tasks.length > 0 
          ? new Date(Math.max(...tasks.map((t: any) => new Date(t.endDate).getTime())))
          : new Date(),
        totalValue,
        agency: { connect: { id: agencyId } },
        client: { connect: { id: clientId } },
        tasks: {
          create: tasks.map((task: any) => ({
            taskType: task.taskType,
            status: "PENDING",
            grossRevenue: parseFloat(task.grossRevenue) || 0,
            margin: parseFloat(task.margin) || 0,
            startDate: new Date(task.startDate),
            endDate: new Date(task.endDate),
            description: task.description,
            
            // FIX: Connect many-to-many relationship for assets
            assets: {
              connect: (task.assetIds || []).map((id: string) => ({ id }))
            },
            
            ...(task.assigneeId && {
              assignee: { connect: { id: task.assigneeId } }
            }),

            externalRentals: {
              create: (task.externalRentals || []).map((r: any) => ({
                itemName: r.itemName,
                cost: parseFloat(r.cost) || 0,
              })),
            },
          })),
        },
      },
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("API_PROJECT_CREATE_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}