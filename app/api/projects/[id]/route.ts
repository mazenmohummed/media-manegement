import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  // Make sure this is defined correctly
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // 1. Await the params object
    const { id } = await params;

    // 2. Validate the ID exists
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: id }, // Now id will be a string, not undefined
      include: {
        client: true,
        tasks: {
          include: {
            assignee: true,
            assets: true,
            taskExpenses: true,
            comments: {
              include: { author: true },
              orderBy: { createdAt: "desc" }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("FETCH_PROJECT_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    }

    // Use a Transaction to ensure either everything is deleted or nothing is
    await prisma.$transaction(async (tx) => {
      // 1. Delete Expenses linked to any Task in this Project
      await tx.taskExpense.deleteMany({
        where: {
          task: {
            projectId: id,
          },
        },
      });

      // 2. Delete Tasks linked to this Project
      await tx.task.deleteMany({
        where: {
          projectId: id,
        },
      });

      // 3. Finally, delete the Project itself
      await tx.project.delete({
        where: {
          id: id,
        },
      });
    });

    return NextResponse.json({ message: "Project and all related data purged." });
  } catch (error) {
    console.error("Delete Project Error:", error);
    return NextResponse.json(
      { error: "Failed to purge project data." },
      { status: 500 }
    );
  }
}