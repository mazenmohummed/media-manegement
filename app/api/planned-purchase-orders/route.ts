import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json({ error: 'Missing agencyId' }, { status: 400 });
    }

    const plannedOrders = await db.plannedPurchaseOrder.findMany({
      where: { agencyId },
      include: {
        vendors: { include: { vendor: true } },
        project: true,
        quotation: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(plannedOrders, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch planned orders', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agencyId, projectId, quotationId, currency, expectedDeliveryDate, notes, vendorId, items } = body;

    if (!agencyId) {
      return NextResponse.json({ error: 'Missing required field: agencyId' }, { status: 400 });
    }

    let calculatedTotal = 0;
    const processedItems = (items || []).map((item: any) => {
      const quantity = parseFloat(item.quantity) || 1.0;
      const unitCost = parseFloat(item.unitCost) || 0.0;
      const total = quantity * unitCost;
      calculatedTotal += total;
      return { description: item.description, quantity, unitCost, total };
    });

    const newPlannedOrder = await db.$transaction(async (tx) => {
      const count = await tx.plannedPurchaseOrder.count({ where: { agencyId } });
      const plannedPoNo = `PPO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const createdOrder = await tx.plannedPurchaseOrder.create({
        data: {
          plannedPoNo,
          agencyId,
          projectId: projectId || null,
          quotationId: quotationId || null,
          vendorId: vendorId || null, // <-- Fixed: correctly map the single vendorId field
          status: 'PLANNED',
          totalAmount: calculatedTotal,
          currency: currency || 'EGP',
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          notes,
          // If you also want to support it in your junction table automatically:
          vendors: vendorId ? {
            create: [{ vendorId }]
          } : undefined,
          items: processedItems.length > 0 ? {
            create: processedItems
          } : undefined,
        },
        include: {
          vendor: true, // Include single vendor relation
          vendors: { include: { vendor: true } },
          items: true,
        },
      });

      if (quotationId) {
        const quotation = await tx.quotation.findUnique({
          where: { id: quotationId },
          select: { plannedAmount: true },
        });

        const currentPlannedAmount = quotation?.plannedAmount ?? 0;

        await tx.quotation.update({
          where: { id: quotationId },
          data: { plannedAmount: currentPlannedAmount + calculatedTotal },
        });
      }

      return createdOrder;
    });

    return NextResponse.json(newPlannedOrder, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create planned order', details: error.message }, { status: 500 });
  }
}