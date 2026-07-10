import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// Function to compute and return the updated status for a project invoice
async function recalculateInvoiceStatus(tx: any, projectId: string, agencyId: string) {
  const project = await tx.project.findUnique({
    where: { id: projectId, agencyId },
    include: { payments: true },
  });

  if (!project) return;

  const totalPaid = project.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  
  let nextStatus = "SENT";
  if (totalPaid >= project.totalValue) {
    nextStatus = "PAID";
  } else if (totalPaid > 0) {
    nextStatus = "PARTIALLY_PAID";
  }

  await tx.project.update({
    where: { id: projectId },
    data: { invoiceStatus: nextStatus },
  });
}


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const userAgencyId = session?.user?.agencyId;

    if (!userAgencyId) {
      return new NextResponse("Unauthorized: No Agency Context", { status: 401 });
    }

    if (!id || id === "undefined") {
      return new NextResponse("Invalid Payment ID", { status: 400 });
    }

    // Securely pull data checking agency context walls
    const payment = await prisma.payment.findUnique({
      where: { 
        id: id,
        agencyId: userAgencyId 
      },
      include: {
        client: {
          select: {
            clientName: true,
            clientNo: true,
          }
        },
        // 💡 CRITICAL FIX: Include project relational tracking details for the UI layout
        project: {
          select: {
            id: true,
            projectName: true,
            invoiceNo: true,
          }
        },
        agency: {
          select: {
            agencyName: true,
            email: true,
          }
        }
      }
    });

    if (!payment) {
      return new NextResponse("Payment Not Found", { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error("GET_PAYMENT_BY_ID_ERROR:", error.message);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// 1. PATCH: Update an existing payment amount or tracking attributes
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
    const { amount, method, datePaid, description } = await req.json();

    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Locate the existing transaction record
      const existingPayment = await tx.payment.findUnique({
        where: { id, agencyId: session.user.agencyId },
      });

      if (!existingPayment) throw new Error("Payment record not found");

      // Apply the update
      const payment = await tx.payment.update({
        where: { id },
        data: {
          ...(amount !== undefined && { amount: parseFloat(amount) }),
          ...(method && { method }),
          ...(datePaid && { datePaid: new Date(datePaid) }),
          ...(description !== undefined && { description }),
        },
      });

      // If the target project invoice relation exists, correct its tracking status
      if (existingPayment.projectId) {
        await recalculateInvoiceStatus(tx, existingPayment.projectId, session.user.agencyId);
      }

      return payment;
    });

    return NextResponse.json(updatedPayment);
  } catch (error: any) {
    console.error("PATCH_PAYMENT_ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Failed to update transaction" }, { status: 500 });
  }
}

// 2. DELETE: Wipe out a transaction and revert the invoice status position backward
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { id, agencyId: session.user.agencyId },
      });

      if (!existingPayment) throw new Error("Payment record not found");

      // Purge transaction from collection
      await tx.payment.delete({
        where: { id },
      });

      // Re-evaluate invoice balances if attached to a project context
      if (existingPayment.projectId) {
        await recalculateInvoiceStatus(tx, existingPayment.projectId, session.user.agencyId);
      }
    });

    return NextResponse.json({ success: true, message: "Transaction reverted cleanly." });
  } catch (error: any) {
    console.error("DELETE_PAYMENT_ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Failed to delete transaction" }, { status: 500 });
  }
}