import { NextResponse } from 'next/server';
import { PrismaClient, InvoiceStatus, PaymentAllocationStatus } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List all payments for an agency
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId is required' }, { status: 400 });
    }

    const payments = await prisma.payment.findMany({
      where: { agencyId },
      include: {
        client: { select: { id: true, clientName: true } },
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNo: true, totalAmount: true } },
          },
        },
      },
      orderBy: { datePaid: 'desc' },
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Record a manual payment and allocate against one or more invoices
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      agencyId,
      clientId,
      amount,
      currency = 'EGP',
      method = 'CASH',
      datePaid,
      referenceNo,
      description,
      allocations, // Array of { invoiceId: string, amount: number }
    } = body;

    if (!agencyId || !clientId || !amount || !datePaid) {
      return NextResponse.json(
        { error: 'Missing required fields: agencyId, clientId, amount, datePaid' },
        { status: 400 }
      );
    }

    // Execute within a transaction to maintain atomicity and balance integrity
    const result = await prisma.$transaction(async (tx) => {
      let totalAllocated = 0;
      const parsedAllocations = allocations || [];

      // Validate allocations and calculate total allocated amount
      for (const alloc of parsedAllocations) {
        totalAllocated += alloc.amount;
      }

      if (totalAllocated > amount) {
        throw new Error('Total allocated amount cannot exceed the total payment amount.');
      }

      const unappliedAmount = amount - totalAllocated;

      // 1. Create the Payment record
      const payment = await tx.payment.create({
        data: {
          agencyId,
          clientId,
          amount,
          unappliedAmount,
          currency,
          method,
          datePaid: new Date(datePaid),
          referenceNo,
          description,
        },
      });

      // 2. Process each allocation and update target invoices
      for (const alloc of parsedAllocations) {
        const invoice = await tx.clientInvoice.findUnique({
          where: { id: alloc.invoiceId },
        });

        if (!invoice) {
          throw new Error(`Invoice with ID ${alloc.invoiceId} not found.`);
        }

        const newAmountPaid = invoice.amountPaid + alloc.amount;
        const newBalanceDue = Math.max(0, invoice.totalAmount - newAmountPaid);
        
        let newStatus: InvoiceStatus = invoice.status;
        if (newBalanceDue === 0) {
          newStatus = InvoiceStatus.PAID;
        } else if (newAmountPaid > 0) {
          newStatus = InvoiceStatus.PARTIALLY_PAID;
        }

        // Create the payment allocation record
        await tx.paymentAllocation.create({
          data: {
            agencyId,
            clientId,
            paymentId: payment.id,
            invoiceId: alloc.invoiceId,
            amount: alloc.amount,
            currency,
            status: PaymentAllocationStatus.APPLIED,
          },
        });

        // Update the invoice amounts and status
        await tx.clientInvoice.update({
          where: { id: alloc.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            status: newStatus,
            paidAt: newStatus === InvoiceStatus.PAID ? new Date() : invoice.paidAt,
          },
        });
      }

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}