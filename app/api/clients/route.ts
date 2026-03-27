import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// GET: Fetch all clients for the logged-in agency
export async function GET() {
  const session = await getServerSession(authOptions);

  // 1. Check if the user is authenticated and linked to an agency
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clients = await prisma.client.findMany({
      // THE WALL: Only fetch clients belonging to THIS agency
      where: { 
        agencyId: session.user.agencyId 
      }, 
      select: {
        id: true,
        clientName: true,
        accountType: true,
        status: true,
        clientNo: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET_CLIENTS_ERROR:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// POST: Create a new client
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized: No Agency Context" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { clientName, accountType, status } = body;
    const agencyId = session.user.agencyId;

    if (!clientName || !accountType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. GENERATE AUTO clientNo
    // Count how many clients this agency already has
    const clientCount = await prisma.client.count({
      where: { agencyId }
    });

    // Format: CLI-1001, CLI-1002, etc.
    const nextClientNo = `CLI-${1000 + clientCount + 1}`;

    // 2. Create the record
    const newClient = await prisma.client.create({
      data: {
        clientName,
        accountType,
        status: status || "Active",
        clientNo: nextClientNo, // Save the generated number
        agencyId: agencyId, 
      },
    });

    return NextResponse.json(newClient);
  } catch (error: any) {
    console.error("CREATE_CLIENT_ERROR:", error);
    return NextResponse.json({ 
      error: "Failed to create client", 
      details: error.message 
    }, { status: 500 });
  }
}