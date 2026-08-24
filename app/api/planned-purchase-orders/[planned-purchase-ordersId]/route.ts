import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Helper function to generate a sequential purchase order number per agency
async function generatePoNo(tx: any, agencyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const lastPo = await tx.purchaseOrder.findFirst({
    where: { agencyId, poNo: { startsWith: prefix } },
    orderBy: { poNo: "desc" },
    select: { poNo: true },
  });

  let nextSeq = 1;
  if (lastPo?.poNo) {
    const lastSeq = parseInt(lastPo.poNo.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ "planned-purchase-ordersId": string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams["planned-purchase-ordersId"];

    const plannedOrder = await db.plannedPurchaseOrder.findUnique({
      where: { id },
      include: {
        vendors: { include: { vendor: true } },
        project: true,
        quotation: true,
        items: true,
      },
    });

    if (!plannedOrder || plannedOrder.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(plannedOrder, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching planned order:", error);
    return NextResponse.json(
      { error: "Failed to fetch record", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ "planned-purchase-ordersId": string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams["planned-purchase-ordersId"];

    const body = await req.json();
    const { action, totalAmount, notes, expectedDeliveryDate, quotationId, currency, items } = body;

    const existingOrder = await db.plannedPurchaseOrder.findUnique({
      where: { id },
      include: { vendors: true, items: true },
    });

    if (!existingOrder || existingOrder.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Planned order not found" }, { status: 404 });
    }

    // Handle Quick Action Buttons (APPROVE / REJECT / CONVERT)
    if (action === "REJECT" || action === "APPROVE") {
      const updated = await db.plannedPurchaseOrder.update({
        where: { id },
        data: { status: action === "REJECT" ? "REJECTED" : "APPROVED" },
      });
      return NextResponse.json(updated);
    }

    if (action === "CONVERT") {
      const primaryVendorId =
        existingOrder.vendors[0]?.vendorId ?? existingOrder.vendorId ?? undefined;

      if (!primaryVendorId) {
        return NextResponse.json(
          { error: "Cannot convert to PO without an assigned vendor." },
          { status: 400 }
        );
      }

      const result = await db.$transaction(async (tx) => {
        const poNo = await generatePoNo(tx, existingOrder.agencyId);

        const purchaseOrder = await tx.purchaseOrder.create({
          data: {
            poNo,
            status: "DRAFT",
            totalAmount: existingOrder.totalAmount,
            currency: existingOrder.currency,
            expectedDeliveryDate: existingOrder.expectedDeliveryDate,
            notes: existingOrder.notes,
            vendorId: primaryVendorId,
            quotationId: existingOrder.quotationId,
            projectId: existingOrder.projectId,
            agencyId: existingOrder.agencyId,
            items: {
              create: existingOrder.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitCost: item.unitCost,
                total: item.total,
              })),
            },
          },
        });

        await tx.plannedPurchaseOrder.update({
          where: { id },
          data: { status: "CONVERTED" as any },
        });

        return purchaseOrder;
      });

      return NextResponse.json(result);
    }

    // Handle Full Edit & PlannedAmount Sync Transaction
    const result = await db.$transaction(async (tx) => {
      let calculatedTotal = totalAmount !== undefined ? parseFloat(totalAmount) : existingOrder.totalAmount;

      // If items are submitted, calculate totals from items and replace old items
      if (items && Array.isArray(items)) {
        calculatedTotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitCost)), 0);
        await tx.plannedPurchaseOrderItem.deleteMany({ where: { plannedPurchaseOrderId: id } });
      }

      const updatedOrder = await tx.plannedPurchaseOrder.update({
        where: { id },
        data: {
          totalAmount: calculatedTotal,
          ...(currency !== undefined ? { currency } : {}),
          ...(notes !== undefined ? { notes: notes || null } : {}),
          ...(expectedDeliveryDate !== undefined ? { expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null } : {}),
          ...(quotationId !== undefined ? { quotationId: quotationId || null } : {}),
          ...(items && Array.isArray(items) ? {
            items: {
              create: items.map((item: any) => ({
                description: item.description,
                quantity: parseFloat(item.quantity),
                unitCost: parseFloat(item.unitCost),
                total: parseFloat(item.quantity) * parseFloat(item.unitCost),
              }))
            }
          } : {})
        },
        include: { items: true, quotation: true }
      });

      // Synchronize quotation plannedAmount values
      const oldQuotationId = existingOrder.quotationId;
      const newQuotationId = updatedOrder.quotationId;
      const oldAmount = existingOrder.totalAmount;
      const newAmount = updatedOrder.totalAmount;

      if (oldQuotationId === newQuotationId && oldQuotationId) {
        const diff = newAmount - oldAmount;
        if (diff !== 0) {
          await tx.quotation.update({
            where: { id: oldQuotationId },
            data: { plannedAmount: { increment: diff } }
          });
        }
      } else {
        if (oldQuotationId) {
          await tx.quotation.update({
            where: { id: oldQuotationId },
            data: { plannedAmount: { decrement: oldAmount } }
          });
        }
        if (newQuotationId) {
          await tx.quotation.update({
            where: { id: newQuotationId },
            data: { plannedAmount: { increment: newAmount } }
          });
        }
      }

      return updatedOrder;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error updating planned order:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ "planned-purchase-ordersId": string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams["planned-purchase-ordersId"];
    
    const plannedOrder = await db.plannedPurchaseOrder.findUnique({
      where: { id },
    });

    if (!plannedOrder || plannedOrder.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.plannedPurchaseOrder.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting planned order:", error);
    return NextResponse.json(
      { error: "Failed to record deletion", details: error.message },
      { status: 500 }
    );
  }
}