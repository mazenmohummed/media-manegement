import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/purchase-orders/[purchase-orderId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ "purchase-orderId": string }> }
) {
  try {
    // 1. Match the exact folder parameter name [purchase-orderId]
    const resolvedParams = await params;
    const id = resolvedParams["purchase-orderId"];

    const body = await request.json();
    const { notes, items, expectedDeliveryDate, status, currency } = body;

    let updatedTotalAmount = undefined;
    let itemsOperation = undefined;

    if (items && Array.isArray(items)) {
      const parsedItems = items.map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const cost = Number(item.unitCost) || 0;
        return {
          description: item.description,
          quantity: qty,
          unitCost: cost,
          total: qty * cost,
        };
      });

      updatedTotalAmount = parsedItems.reduce((acc, item) => acc + item.total, 0);

      itemsOperation = {
        deleteMany: {},
        create: parsedItems,
      };
    }

    // 2. Perform the Purchase Order update
    const updatedPO = await db.purchaseOrder.update({
      where: { id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
        ...(currency && { currency }),
        ...(expectedDeliveryDate && { expectedDeliveryDate: new Date(expectedDeliveryDate) }),
        ...(updatedTotalAmount !== undefined && { totalAmount: updatedTotalAmount }),
        ...(itemsOperation && { items: itemsOperation }),
      },
      include: {
        vendor: true,
        items: true,
      },
    });

    // 3. Sync changes with the linked Quotation if it exists
    if (updatedPO.quotationId) {
      const finalAmount = updatedTotalAmount !== undefined ? updatedTotalAmount : updatedPO.totalAmount;
      const finalCurrency = currency || updatedPO.currency;

      await db.quotation.update({
        where: { id: updatedPO.quotationId },
        data: {
          amount: finalAmount,
          currency: finalCurrency,
        },
      });
    }

    return NextResponse.json(updatedPO, { status: 200 });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/purchase-orders/[purchase-orderId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ "purchase-orderId": string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams["purchase-orderId"];

    await db.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id },
    });

    const deletedPO = await db.purchaseOrder.delete({
      where: { id },
    });

    return NextResponse.json(deletedPO, { status: 200 });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}