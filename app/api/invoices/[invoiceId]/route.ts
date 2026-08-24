import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

// Allowed lifecycle transition map
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "PARTIALLY_PAID", "PAID"],
  SENT: ["PARTIALLY_PAID", "PAID", "OVERDUE"],
  PARTIALLY_PAID: ["PAID", "OVERDUE"],
  OVERDUE: ["PARTIALLY_PAID", "PAID"],
  PAID: [], // Terminal state, cannot transition back unless admin override
};

function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
  if (currentStatus === newStatus) return true;
  const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedNext.includes(newStatus);
}

// Helper to recalculate invoice financials safely
async function recalculateInvoiceTotals(invoiceId: string, tx: any) {
  const items = await tx.clientInvoiceItem.findMany({
    where: { invoiceId },
  });

  let subtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const lineTotal = item.quantity * item.unitPrice - item.discountAmount;
    subtotal += lineTotal;
    totalTax += lineTotal * (item.taxRate / 100);
  }

  const invoice = await tx.clientInvoice.findUnique({
    where: { id: invoiceId },
    select: { discount: true, amountPaid: true, status: true, dueDate: true, totalAmount: true },
  });

  if (!invoice) return;

  const globalDiscount = invoice.discount || 0;
  const totalAmount = Math.max(0, subtotal + totalTax - globalDiscount);
  const balanceDue = Math.max(0, totalAmount - invoice.amountPaid);

  // Determine automatic financial-based status update if balances clear out
  let calculatedStatus = invoice.status;
  if (balanceDue === 0) {
    calculatedStatus = "PAID";
  } else if (invoice.amountPaid > 0) {
    calculatedStatus = "PARTIALLY_PAID";
  } else if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && calculatedStatus === "SENT") {
    calculatedStatus = "OVERDUE";
  }

  await tx.clientInvoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      taxAmount: totalTax,
      totalAmount,
      balanceDue,
      status: calculatedStatus,
    },
  });
}

// GET /api/invoices/[invoiceId] - Fetch single invoice details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const { invoiceId } = await params;

  try {
    const invoice = await db.clientInvoice.findUnique({
      where: { id: invoiceId, agencyId },
      include: {
        client: true,
        project: { select: { id: true, name: true, projectName: true } },
        agency: { select: { agencyName: true } },
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice, { status: 200 });
  } catch (err: any) {
    console.error("Get invoice error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch invoice" }, { status: 500 });
  }
}

// PATCH /api/invoices/[invoiceId] - Update invoice fields, notes, or payment adjustments
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const { invoiceId } = await params;

  try {
    const body = await req.json();
    const { dueDate, notes, status, discount, amountPaid, taxRate, ...otherFields } = body;

    const existingInvoice = await db.clientInvoice.findUnique({
      where: { id: invoiceId, agencyId },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Enforce status transition rules if status is explicitly updated
    if (status && status !== existingInvoice.status) {
      const isValidMove = validateStatusTransition(existingInvoice.status, status);
      if (!isValidMove) {
        return NextResponse.json(
          { error: `Invalid status transition from ${existingInvoice.status} to ${status}` },
          { status: 400 }
        );
      }
    }

    const updatedInvoice = await db.$transaction(async (tx) => {
      // Update parent invoice details
      await tx.clientInvoice.update({
        where: { id: invoiceId },
        data: {
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes: notes !== undefined ? notes : undefined,
          status: status !== undefined ? status : undefined,
          discount: discount !== undefined ? parseFloat(discount) : undefined,
          amountPaid: amountPaid !== undefined ? parseFloat(amountPaid) : undefined,
        },
      });

      // If a global taxRate update was passed, apply it to items
      if (taxRate !== undefined) {
        await tx.clientInvoiceItem.updateMany({
          where: { invoiceId },
          data: { taxRate: parseFloat(taxRate) },
        });
      }

      // Recalculate totals and balance dues
      await recalculateInvoiceTotals(invoiceId, tx);

      return await tx.clientInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          client: true,
          project: { select: { id: true, name: true, projectName: true } },
          items: true,
        },
      });
    });

    return NextResponse.json(updatedInvoice, { status: 200 });
  } catch (err: any) {
    console.error("Update invoice error:", err);
    return NextResponse.json({ error: err.message || "Failed to update invoice" }, { status: 500 });
  }
}

// DELETE /api/invoices/[invoiceId] - Delete invoice and its associated line items
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const { invoiceId } = await params;

  try {
    const existingInvoice = await db.clientInvoice.findUnique({
      where: { id: invoiceId, agencyId },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      // Clean up child items first to satisfy foreign key constraints
      await tx.clientInvoiceItem.deleteMany({
        where: { invoiceId },
      });

      // Delete parent invoice
      await tx.clientInvoice.delete({
        where: { id: invoiceId },
      });
    });

    return NextResponse.json({ success: true, message: "Invoice deleted successfully" }, { status: 200 });
  } catch (err: any) {
    console.error("Delete invoice error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete invoice" }, { status: 500 });
  }
}