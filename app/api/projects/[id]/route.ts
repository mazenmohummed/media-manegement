import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

/**
 * GET: Fetch a single project by ID
 * Restricted to the user's specific Agency
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    // 1. Authorization Check
    if (!agencyId) {
      return NextResponse.json(
        { error: "Unauthorized: No Agency linked to user session" }, 
        { status: 401 }
      );
    }

    const { id } = await params;

    // 2. Database Query
    const project = await prisma.project.findUnique({
      where: { 
        id: id,
        agencyId: agencyId // Security: Ensure users can't see projects from other agencies
      },
      include: {
        client: true,
        agency: true,
        tasks: {
          include: {
            assignees: true,
            taskExpenses: true,
            todos: true,
            assets: true,
            agency: true,
          }
        }
      }
    });

    // 3. Response Handling
    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" }, 
        { status: 404 }
      );
    }

    return NextResponse.json(project);

  } catch (error: any) {
    console.error("ROUTE_ERROR_PROJECT_BY_ID:", error);

    // 4. Handle MongoDB Atlas Specific Errors (P2010 = Timeout/Connection)
    if (error.code === 'P2010' || error.message.includes('timeout')) {
      return NextResponse.json(
        { error: "Database connection timeout. Please verify your Network Access in Atlas." }, 
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "An internal server error occurred" }, 
      { status: 500 }
    );
  }
}