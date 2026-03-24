import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Fetch all clients for the logged-in agency
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      // Remove the where clause temporarily to see if ANY clients show up
      // where: { agencyId: "..." }, 
      select: {
        id: true,
        clientName: true,
      },
    });
    console.log("Clients found:", clients); // Check your terminal!
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// POST: Create a new client
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Incoming Body:", body); // Debug 1

    const { clientName, accountType, status, agencyId } = body;

    // Validate agencyId presence
    if (!agencyId) {
      return NextResponse.json({ error: "Missing Agency ID" }, { status: 400 });
    }

    const newClient = await prisma.client.create({
      data: {
        clientName,
        accountType,
        status: status || "Active",
        agencyId, 
      },
    });

    return NextResponse.json(newClient);
  } catch (error: any) {
    console.error("PRISMA ERROR:", error); // Debug 2 - Check your terminal!
    return NextResponse.json({ 
      error: "Failed to create client", 
      details: error.message 
    }, { status: 500 });
  }
}