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
            externalRentals: true,
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