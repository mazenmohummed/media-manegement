import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { amount, method, datePaid, clientId, projectId, description } = await req.json();

    if (!amount || amount <= 0 || !clientId || !projectId) {
      return NextResponse.json({ error: "Missing required transactional fields" }, { status: 400 });
    }

    // Run as an atomic transaction to avoid race conditions or sequential number collisions
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Verify the invoice exists and belongs to this workspace
      const project = await tx.project.findUnique({
        where: { id: projectId, agencyId: session.user.agencyId },
        include: { payments: true }
      });

      if (!project) throw new Error("Invoice record not found in workspace");

      // 2. Generate an auto-incremented sequential Voucher reference code
      const currentYear = new Date(datePaid).getFullYear();
      
      // Count existing transactions for this agency during the target year
      const paymentCount = await tx.payment.count({
        where: {
          agencyId: session.user.agencyId,
          datePaid: {
            gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
          }
        }
      });

      // Construct formatted pad string sequence e.g., TRX-2026-0001
      const generatedPaymentNo = `TRX-${currentYear}-${String(paymentCount + 1).padStart(4, "0")}`;

      // 3. Compute aggregate balance tracking
      const previousPaidSum = project.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalPaidSoFar = previousPaidSum + parseFloat(amount);
      const invoiceTotalValue = project.totalValue;

      // 4. Determine the dynamic billing status transition logic
      let updatedStatus: "PAID" | "PARTIALLY_PAID" | "SENT" = "SENT";
      if (totalPaidSoFar >= invoiceTotalValue) {
        updatedStatus = "PAID";
      } else if (totalPaidSoFar > 0) {
        updatedStatus = "PARTIALLY_PAID";
      }

      // 5. Record the secure payment entry with the assigned reference string
      const newPayment = await tx.payment.create({
        data: {
          paymentNo: generatedPaymentNo, // 💡 Assigned serial value here
          amount: parseFloat(amount),
          method,
          datePaid: new Date(datePaid),
          clientId,
          projectId,
          agencyId: session.user.agencyId,
          description: description || `Payment statement capture for ${project.projectName}`
        }
      });

      // 6. Commit status changes directly back onto the project ledger entry
      await tx.project.update({
        where: { id: projectId },
        data: { invoiceStatus: updatedStatus }
      });

      return newPayment;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[INVOICE_POST_ERR]", error.message);
    return NextResponse.json({ error: error.message || "Internal System Sync Error" }, { status: 500 });
  }
}