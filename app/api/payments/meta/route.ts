// app/api/payments/meta/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agencyId");

    if (!agencyId) {
      return NextResponse.json({ error: "Agency ID is required" }, { status: 400 });
    }

    // Fetch clients for the agency
    const clients = await prisma.client.findMany({
      where: { agencyId, deletedAt: null },
      select: { id: true, clientName: true, clientNo: true },
      orderBy: { clientName: "asc" },
    });

    // Fetch open/unpaid or partially paid invoices for the agency
    const invoices = await prisma.clientInvoice.findMany({
      where: {
        agencyId,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE", "DRAFT"] },
      },
      select: {
        id: true,
        invoiceNo: true,
        clientId: true,
        balanceDue: true,
        totalAmount: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate the next auto-incrementing reference number for this agency
    const latestPayment = await prisma.payment.findFirst({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      select: { referenceNo: true },
    });

    let nextReferenceNo = "1";
    if (latestPayment && latestPayment.referenceNo) {
      // Parse numeric portion if stored values are numeric strings (e.g. "1", "2")
      const parsedSeq = parseInt(latestPayment.referenceNo, 10);
      if (!isNaN(parsedSeq)) {
        nextReferenceNo = String(parsedSeq + 1);
      }
    }

    return NextResponse.json({ clients, invoices, nextReferenceNo }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/payments/meta Error]:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch meta" }, { status: 500 });
  }
}