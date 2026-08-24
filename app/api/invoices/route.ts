import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Ensure user is authenticated and scoped to an agency
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = await db.clientInvoice.findMany({
      where: { 
        agencyId: session.user.agencyId 
      },
      include: {
        client: { 
          select: { clientName: true } 
        },
        project: { 
          select: { name: true, projectName: true } 
        },
      },
      orderBy: { 
        createdAt: "desc" 
      },
    });

    return NextResponse.json(invoices);
  } catch (err) {
    console.error("API Error fetching invoices:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
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
    select: { discount: true, amountPaid: true },
  });

  if (!invoice) return;

  const globalDiscount = invoice.discount || 0;
  const totalAmount = Math.max(0, subtotal + totalTax - globalDiscount);
  const balanceDue = Math.max(0, totalAmount - invoice.amountPaid);

  await tx.clientInvoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      taxAmount: totalTax,
      totalAmount,
      balanceDue,
      status: balanceDue === 0 ? "PAID" : invoice.amountPaid > 0 ? "PARTIALLY_PAID" : "DRAFT",
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = session.user.agencyId; // Guaranteed string after check

  try {
    const body = await req.json();
    const { projectId, dueDate, notes, taxRate = 0, discount = 0, taskIds } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // 1. Fetch project details along with client context
    const project = await db.project.findUnique({
      where: { id: projectId, agencyId, deletedAt: null },
      include: {
        client: true,
        tasks: {
          where: taskIds?.length ? { id: { in: taskIds }, deletedAt: null } : { deletedAt: null },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
    }

    if (!project.clientId) {
      return NextResponse.json({ error: "Project must be assigned to a client before invoicing" }, { status: 400 });
    }

    // 2. Generate unique invoice number sequence
    const count = await db.clientInvoice.count({
      where: { agencyId },
    });
    const invoiceNo = `INV-${String(count + 1).padStart(4, "0")}`;

    // 3. Create Invoice and corresponding Invoice Items in a Transaction
    const invoice = await db.$transaction(async (tx) => {
      const newInvoice = await tx.clientInvoice.create({
        data: {
          invoiceNo,
          agencyId,
          clientId: project.clientId!,
          projectId: project.id,
          currency: project.currency || "EGP",
          status: "DRAFT",
          discount: discount || 0,
          issuedAt: new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes?.trim() || `Generated from project: ${project.name}`,
        },
      });

      const itemsToCreate = project.tasks.length > 0 
        ? project.tasks.map((task) => ({
            invoiceId: newInvoice.id,
            description: `Task: ${task.title}`,
            quantity: 1.0,
            unitPrice: project.totalValue && project.tasks.length > 0 ? project.totalValue / project.tasks.length : 0,
            taxRate: taxRate,
            taskId: task.id,
            isBillable: true,
          }))
        : [
            {
              invoiceId: newInvoice.id,
              description: `Project Fee: ${project.name}`,
              quantity: 1.0,
              unitPrice: project.totalValue || 0,
              taxRate: taxRate,
              isBillable: true,
            },
          ];

      await tx.clientInvoiceItem.createMany({
        data: itemsToCreate,
      });

      await recalculateInvoiceTotals(newInvoice.id, tx);

      return await tx.clientInvoice.findUnique({
        where: { id: newInvoice.id },
        include: {
          client: { select: { id: true, clientName: true, email: true } },
          project: { select: { id: true, name: true, projectName: true } },
          items: true,
        },
      });
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err: any) {
    console.error("Create invoice from project error:", err);
    return NextResponse.json({ error: err.message || "Failed to create invoice" }, { status: 500 });
  }
}