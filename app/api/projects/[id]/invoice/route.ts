import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// GET: Fetch a complete invoice with its line items (Tasks) and client data
export async function GET(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const projectInvoice = await prisma.project.findFirst({
      where: { id, agencyId },
      include: {
        client: true,
        agency: {
          select: { agencyName: true, address: true }
        },
        tasks: {
          select: {
            id: true,
            taskType: true,     // 💡 Changed from taskName to taskType
            totalInvoice: true, // 💡 Changed from internalCost to totalInvoice
            description: true,
          }
        },
      },
    });

    if (!projectInvoice) {
      return NextResponse.json({ error: "Invoice/Project profile not found" }, { status: 404 });
    }

    // 💡 Safely sum the total invoice value from the line items
    const lineItemTotal = projectInvoice.tasks.reduce((sum, t) => sum + (t.totalInvoice || 0), 0);
    
    return NextResponse.json({
      ...projectInvoice,
      totalValue: projectInvoice.totalValue || lineItemTotal,
      calculatedTotal: lineItemTotal
    });

  } catch (error: any) {
    console.error("[INVOICE_GET_ERR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: Update metadata fields manually
export async function PATCH(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { invoiceStatus, invoiceNo, totalValue } = body;

    const updatedInvoice = await prisma.project.update({
      where: { id, agencyId },
      data: {
        ...(invoiceStatus && { invoiceStatus }),
        ...(invoiceNo && { invoiceNo }),
        ...(totalValue !== undefined && { totalValue: parseFloat(totalValue) }),
      },
    });

    return NextResponse.json(updatedInvoice);

  } catch (error: any) {
    console.error("[INVOICE_PATCH_ERR]", error);
    return NextResponse.json({ error: "Failed to update invoice parameters." }, { status: 500 });
  }
}