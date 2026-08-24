import { NextResponse } from 'next/server';
import { PrismaClient, InvoiceStatus } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch a single payment with allocations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: true,
        allocations: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Reverse/Delete payment and restore invoice balances
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { allocations: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      for (const allocation of payment.allocations) {
        const invoice = await tx.clientInvoice.findUnique({
          where: { id: allocation.invoiceId },
        });

        if (invoice) {
          const newAmountPaid = Math.max(0, invoice.amountPaid - allocation.amount);
          const newBalanceDue = invoice.totalAmount - newAmountPaid;

          let newStatus: InvoiceStatus = invoice.status;
          if (newBalanceDue > 0 && newAmountPaid === 0) {
            newStatus = InvoiceStatus.SENT;
          } else if (newBalanceDue > 0) {
            newStatus = InvoiceStatus.PARTIALLY_PAID;
          }

          await tx.clientInvoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: newAmountPaid,
              balanceDue: newBalanceDue,
              status: newStatus,
              paidAt: newStatus !== InvoiceStatus.PAID ? null : invoice.paidAt,
            },
          });
        }
      }

      await tx.paymentAllocation.deleteMany({
        where: { paymentId },
      });

      await tx.payment.delete({
        where: { id: paymentId },
      });
    });

    return NextResponse.json({ success: true, message: 'Payment deleted and invoices updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}