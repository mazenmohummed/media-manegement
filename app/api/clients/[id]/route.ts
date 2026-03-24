import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Await params if using Next.js 15 (otherwise it might be undefined)
    const { id } = await params; 
    
    console.log("SEARCHING FOR ID:", id); // Check if this matches your DB exactly

    const client = await prisma.client.findUnique({
      where: { id: String(id) }, // Force string type
      include: {
        projects: true,
        payments: true,
      },
    });

    if (!client) {
      console.log("RESULT: NULL - Client not found in DB");
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error("API ROUTE ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Define as a Promise
) {
  try {
    // 1. Await the params to get the actual ID
    const { id } = await params; 
    
    const body = await req.json();

    // 2. Perform the update
    const updatedClient = await prisma.client.update({
      where: { id: id }, // Now id will be "cmn3t2wg5..."
      data: {
        clientName: body.clientName,
        accountType: body.accountType,
        status: body.status,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
