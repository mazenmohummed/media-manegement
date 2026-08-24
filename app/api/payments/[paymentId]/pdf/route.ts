import { NextResponse } from 'next/server';
import { generatePaymentReceiptPdf } from '@/lib/pdf/payment-receipt-generator';
import { db } from '@/lib/db'; 

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: true,
        agency: true,
        allocations: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!payment) {
      return new NextResponse('Payment not found', { status: 404 });
    }

    const pdfBuffer = await generatePaymentReceiptPdf(payment);

    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Receipt-${payment.referenceNo || payment.id.slice(-8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating payment PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}