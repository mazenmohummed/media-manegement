import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// GET: Fetch a specific client with their projects and payments
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { 
        id: id,
        agencyId: session.user.agencyId // THE WALL: Prevents cross-agency data leaks
      },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          orderBy: { datePaid: 'desc' }
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found in your workspace" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error("GET_CLIENT_DETAIL_ERROR:", error.message);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

// PATCH: Update client details
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Use updateMany or update with an agencyId filter in the 'where' clause
    const updatedClient = await prisma.client.update({
      where: { 
        id: id,
        agencyId: session.user.agencyId // THE WALL: Only update if it belongs to THIS agency
      }, 
      data: {
        clientName: body.clientName,
        accountType: body.accountType,
        status: body.status,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error("PATCH_CLIENT_ERROR:", error);
    // If the record exists but the agencyId doesn't match, Prisma throws a P2025 error
    return NextResponse.json({ error: "Update failed. Record not found or unauthorized." }, { status: 500 });
  }
}