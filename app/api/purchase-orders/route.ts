import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate a sequential purchase order number per agency
async function generatePoNo(tx: any, agencyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const lastPo = await tx.purchaseOrder.findFirst({
    where: { agencyId, poNo: { startsWith: prefix } },
    orderBy: { poNo: 'desc' },
    select: { poNo: true },
  });

  let nextSeq = 1;
  if (lastPo?.poNo) {
    const lastSeq = parseInt(lastPo.poNo.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// GET: Fetch all purchase orders for an agency (optionally filter by ?vendorId=... or ?projectId=...)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');
    const vendorId = searchParams.get('vendorId');
    const projectId = searchParams.get('projectId');

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: agencyId' },
        { status: 400 }
      );
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        agencyId,
        ...(vendorId ? { vendorId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      include: {
        vendor: true,
        project: true,
        quotation: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(purchaseOrders, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new purchase order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      agencyId, 
      vendorId, 
      projectId, 
      quotationId, 
      currency, 
      expectedDeliveryDate, 
      notes, 
      items 
    } = body;

    // Validation
    if (!agencyId || !vendorId) {
      return NextResponse.json(
        { error: 'Missing required fields: agencyId and vendorId are required.' },
        { status: 400 }
      );
    }

    // Process and calculate line items totals
    let calculatedTotal = 0;
    const processedItems = (items || []).map((item: any) => {
      const quantity = parseFloat(item.quantity) || 1.0;
      const unitCost = parseFloat(item.unitCost) || 0.0;
      const total = quantity * unitCost;
      calculatedTotal += total;

      return {
        description: item.description,
        quantity,
        unitCost,
        total,
      };
    });

    // Use a transaction to create the purchase order and update the quotation amount if linked
    const newPurchaseOrder = await prisma.$transaction(async (tx) => {
      const poNo = await generatePoNo(tx, agencyId);

      const createdOrder = await tx.purchaseOrder.create({
        data: {
          poNo,
          agencyId,
          vendorId,
          projectId: projectId || null,
          quotationId: quotationId || null,
          status: 'DRAFT',
          totalAmount: calculatedTotal,
          currency: currency || 'EGP',
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          notes,
          items: processedItems.length > 0 ? {
            create: processedItems,
          } : undefined,
        },
        include: {
          vendor: true,
          project: true,
          items: true,
        },
      });

      if (quotationId) {
        const quotation = await tx.quotation.findUnique({
          where: { id: quotationId },
          select: { amount: true },
        });

        const currentAmount = quotation?.amount ?? 0;

        await tx.quotation.update({
          where: { id: quotationId },
          data: { amount: currentAmount + calculatedTotal },
        });
      }

      return createdOrder;
    });

    return NextResponse.json(newPurchaseOrder, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create purchase order', details: error.message },
      { status: 500 }
    );
  }
}