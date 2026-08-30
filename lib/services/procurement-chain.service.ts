// lib/services/procurement-chain.service.ts
import { db } from "@/lib/db";
import { 
  TaskPlannedExpense, 
  Quotation, 
  PlannedPurchaseOrder, 
  PurchaseOrder,
  QuotationStatus,
  PlannedOrderStatus,
  PurchaseOrderStatus,
  TaskExpenseCategory
} from "@prisma/client";

export interface ProcurementChainContext {
  agencyId: string;
  userId: string;
}

export class ProcurementChainService {
  /**
   * Convert a planned expense to a quotation
   */
  static async convertPlannedExpenseToQuotation(
    plannedExpenseId: string,
    context: ProcurementChainContext
  ): Promise<{ quotation: Quotation; plannedExpense: TaskPlannedExpense }> {
    return await db.$transaction(async (tx) => {
      // 1. Get the planned expense
      const plannedExpense = await tx.taskPlannedExpense.findUnique({
        where: { id: plannedExpenseId },
        include: {
          task: {
            include: {
              project: true,
            },
          },
          vendor: true,
        },
      });

      if (!plannedExpense) {
        throw new Error("Planned expense not found");
      }

      if (plannedExpense.status !== "DRAFT") {
        throw new Error("Only draft planned expenses can be converted to quotations");
      }

      // 2. Generate quotation number
      const year = new Date().getFullYear();
      const prefix = `QT-${year}-`;
      const lastQuotation = await tx.quotation.findFirst({
        where: {
          agencyId: context.agencyId,
          quotationNo: { startsWith: prefix },
        },
        orderBy: { quotationNo: 'desc' },
        select: { quotationNo: true },
      });

      let nextSeq = 1;
      if (lastQuotation?.quotationNo) {
        const lastSeq = parseInt(lastQuotation.quotationNo.slice(prefix.length), 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }
      const quotationNo = `${prefix}${String(nextSeq).padStart(4, '0')}`;

      // 3. Create the quotation
      const quotation = await tx.quotation.create({
        data: {
          quotationNo,
          description: `Quotation for ${plannedExpense.itemName}`,
          amount: plannedExpense.totalEstimated,
          plannedAmount: plannedExpense.totalEstimated,
          currency: plannedExpense.currency || "EGP",
          status: "REQUESTED",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          projectId: plannedExpense.task?.projectId || null,
          vendorId: plannedExpense.vendorId || null,
          agencyId: context.agencyId,
        },
      });

      // 4. Link the planned expense to the quotation
      // Note: You may want to add a quotationId field to TaskPlannedExpense
      // For now, we'll update the status to APPROVED
      const updatedPlannedExpense = await tx.taskPlannedExpense.update({
        where: { id: plannedExpenseId },
        data: {
          status: "APPROVED",
        },
      });

      // 5. Create audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "Quotation",
          entityId: quotation.id,
          message: `Quotation ${quotationNo} created from planned expense ${plannedExpense.itemName}`,
          agencyId: context.agencyId,
          actorId: context.userId,
          metadata: {
            plannedExpenseId,
            amount: plannedExpense.totalEstimated,
          },
        },
      });

      return { quotation, plannedExpense: updatedPlannedExpense };
    });
  }

  /**
   * Create a planned purchase order from a quotation
   */
  static async createPlannedOrderFromQuotation(
    quotationId: string,
    vendorIds: string[],
    context: ProcurementChainContext
  ): Promise<{ plannedOrder: PlannedPurchaseOrder; quotation: Quotation }> {
    return await db.$transaction(async (tx) => {
      // 1. Get the quotation
      const quotation = await tx.quotation.findUnique({
        where: { id: quotationId },
        include: {
          vendors: {
            include: {
              vendor: true,
            },
          },
        },
      });

      if (!quotation) {
        throw new Error("Quotation not found");
      }

      if (quotation.status !== "RECEIVED" && quotation.status !== "COMPARED") {
        throw new Error("Quotation must be in RECEIVED or COMPARED status to create a planned order");
      }

      // 2. Validate vendors
      const validVendors = await tx.vendor.findMany({
        where: {
          id: { in: vendorIds },
          agencyId: context.agencyId,
        },
      });

      if (validVendors.length === 0) {
        throw new Error("At least one valid vendor is required");
      }

      // 3. Generate planned PO number
      const year = new Date().getFullYear();
      const prefix = `PPO-${year}-`;
      const lastPlanned = await tx.plannedPurchaseOrder.findFirst({
        where: {
          agencyId: context.agencyId,
          plannedPoNo: { startsWith: prefix },
        },
        orderBy: { plannedPoNo: 'desc' },
        select: { plannedPoNo: true },
      });

      let nextSeq = 1;
      if (lastPlanned?.plannedPoNo) {
        const lastSeq = parseInt(lastPlanned.plannedPoNo.slice(prefix.length), 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }
      const plannedPoNo = `${prefix}${String(nextSeq).padStart(4, '0')}`;

      // 4. Create the planned purchase order
      const plannedOrder = await tx.plannedPurchaseOrder.create({
        data: {
          plannedPoNo,
          status: "PLANNED",
          totalAmount: quotation.amount || 0,
          currency: quotation.currency,
          expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          notes: `Planned order from quotation ${quotation.quotationNo}`,
          quotationId: quotation.id,
          projectId: quotation.projectId || null,
          agencyId: context.agencyId,
          // Create vendor relations
          vendors: {
            create: vendorIds.map((vendorId) => ({
              vendorId,
            })),
          },
          // Create items (you'll need to map these from quotation)
          items: {
            create: [
              // This would come from quotation line items
              // For now, create a placeholder
              {
                description: `Items from quotation ${quotation.quotationNo}`,
                quantity: 1,
                unitCost: quotation.amount || 0,
                total: quotation.amount || 0,
              },
            ],
          },
        },
        include: {
          vendors: {
            include: {
              vendor: true,
            },
          },
          items: true,
        },
      });

      // 5. Update quotation status
      const updatedQuotation = await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status: "SELECTED",
        },
      });

      // 6. Create audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "PlannedPurchaseOrder",
          entityId: plannedOrder.id,
          message: `Planned purchase order ${plannedPoNo} created from quotation ${quotation.quotationNo}`,
          agencyId: context.agencyId,
          actorId: context.userId,
          metadata: {
            quotationId,
            vendorIds,
            totalAmount: plannedOrder.totalAmount,
          },
        },
      });

      return { plannedOrder, quotation: updatedQuotation };
    });
  }

  /**
   * Convert a planned purchase order to a purchase order
   */
  static async convertPlannedOrderToPurchaseOrder(
    plannedOrderId: string,
    context: ProcurementChainContext
  ): Promise<{ purchaseOrder: PurchaseOrder; plannedOrder: PlannedPurchaseOrder }> {
    return await db.$transaction(async (tx) => {
      // 1. Get the planned order
      const plannedOrder = await tx.plannedPurchaseOrder.findUnique({
        where: { id: plannedOrderId },
        include: {
          vendors: {
            include: {
              vendor: true,
            },
          },
          items: true,
          quotation: true,
        },
      });

      if (!plannedOrder) {
        throw new Error("Planned purchase order not found");
      }

      if (plannedOrder.status !== "APPROVED") {
        throw new Error("Planned purchase order must be APPROVED before conversion");
      }

      // 2. Get the primary vendor
      const primaryVendor = plannedOrder.vendors[0]?.vendor;
      if (!primaryVendor) {
        throw new Error("No vendor assigned to this planned order");
      }

      // 3. Generate PO number
      const year = new Date().getFullYear();
      const prefix = `PO-${year}-`;
      const lastPO = await tx.purchaseOrder.findFirst({
        where: {
          agencyId: context.agencyId,
          poNo: { startsWith: prefix },
        },
        orderBy: { poNo: 'desc' },
        select: { poNo: true },
      });

      let nextSeq = 1;
      if (lastPO?.poNo) {
        const lastSeq = parseInt(lastPO.poNo.slice(prefix.length), 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }
      const poNo = `${prefix}${String(nextSeq).padStart(4, '0')}`;

      // 4. Create the purchase order
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          poNo,
          status: "DRAFT",
          subtotal: plannedOrder.totalAmount,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: plannedOrder.totalAmount,
          currency: plannedOrder.currency,
          expectedDeliveryDate: plannedOrder.expectedDeliveryDate,
          notes: plannedOrder.notes,
          vendorId: primaryVendor.id,
          quotationId: plannedOrder.quotationId,
          projectId: plannedOrder.projectId || null,
          agencyId: context.agencyId,
          items: {
            create: plannedOrder.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitCost: item.unitCost,
              total: item.total,
            })),
          },
        },
        include: {
          items: true,
          vendor: true,
        },
      });

      // 5. Update planned order status
      const updatedPlannedOrder = await tx.plannedPurchaseOrder.update({
        where: { id: plannedOrderId },
        data: {
          status: "CONVERTED",
        },
      });

      // 6. Create audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "PurchaseOrder",
          entityId: purchaseOrder.id,
          message: `Purchase order ${poNo} created from planned order ${plannedOrder.plannedPoNo}`,
          agencyId: context.agencyId,
          actorId: context.userId,
          metadata: {
            plannedOrderId,
            totalAmount: plannedOrder.totalAmount,
          },
        },
      });

      // 7. Create notification
      await tx.notification.create({
        data: {
          userId: context.userId,
          agencyId: context.agencyId,
          title: "Purchase Order Created",
          message: `Purchase order ${poNo} has been created from planned order ${plannedOrder.plannedPoNo}`,
          type: "SUCCESS",
          actionUrl: `/dashboard/vendors/purchase-orders/${purchaseOrder.id}`,
        },
      });

      return { purchaseOrder, plannedOrder: updatedPlannedOrder };
    });
  }

  /**
   * Approve a planned purchase order
   */
  static async approvePlannedOrder(
    plannedOrderId: string,
    context: ProcurementChainContext
  ): Promise<PlannedPurchaseOrder> {
    return await db.$transaction(async (tx) => {
      const plannedOrder = await tx.plannedPurchaseOrder.findUnique({
        where: { id: plannedOrderId },
      });

      if (!plannedOrder) {
        throw new Error("Planned purchase order not found");
      }

      if (plannedOrder.status !== "PLANNED") {
        throw new Error("Only PLANNED orders can be approved");
      }

      const updated = await tx.plannedPurchaseOrder.update({
        where: { id: plannedOrderId },
        data: {
          status: "APPROVED",
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId: context.userId,
          agencyId: context.agencyId,
          title: "Planned Order Approved",
          message: `Planned purchase order ${plannedOrder.plannedPoNo} has been approved`,
          type: "SUCCESS",
          actionUrl: `/dashboard/procurement/planned-purchase-orders/${plannedOrderId}`,
        },
      });

      return updated;
    });
  }

  /**
   * Reject a planned purchase order
   */
  static async rejectPlannedOrder(
    plannedOrderId: string,
    reason: string,
    context: ProcurementChainContext
  ): Promise<PlannedPurchaseOrder> {
    return await db.$transaction(async (tx) => {
      const plannedOrder = await tx.plannedPurchaseOrder.findUnique({
        where: { id: plannedOrderId },
      });

      if (!plannedOrder) {
        throw new Error("Planned purchase order not found");
      }

      if (plannedOrder.status !== "PLANNED") {
        throw new Error("Only PLANNED orders can be rejected");
      }

      const updated = await tx.plannedPurchaseOrder.update({
        where: { id: plannedOrderId },
        data: {
          status: "REJECTED",
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId: context.userId,
          agencyId: context.agencyId,
          title: "Planned Order Rejected",
          message: `Planned purchase order ${plannedOrder.plannedPoNo} has been rejected. Reason: ${reason}`,
          type: "WARNING",
          actionUrl: `/dashboard/procurement/planned-purchase-orders/${plannedOrderId}`,
        },
      });

      return updated;
    });
  }

  /**
   * Get the procurement chain status for a task
   */
  static async getTaskProcurementChain(taskId: string) {
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        plannedExpenses: {
          include: {
            vendor: true,
          },
        },
        quotations: {
          include: {
            vendor: true,
            purchaseOrders: {
              include: {
                vendor: true,
              },
            },
            plannedOrders: {
              include: {
                vendors: {
                  include: {
                    vendor: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    return {
      taskId,
      taskName: task.title || task.taskType,
      plannedExpenses: task.plannedExpenses,
      quotations: task.quotations,
      status: {
        hasPlannedExpenses: task.plannedExpenses.length > 0,
        hasQuotations: task.quotations.length > 0,
        hasPurchaseOrders: task.quotations.some(q => q.purchaseOrders.length > 0),
        latestQuotationStatus: task.quotations[0]?.status || null,
      },
    };
  }

  /**
   * Get procurement metrics for dashboard
   */
  static async getProcurementMetrics(agencyId: string) {
    const [quotations, plannedOrders, purchaseOrders] = await Promise.all([
      db.quotation.count({ where: { agencyId } }),
      db.plannedPurchaseOrder.count({ where: { agencyId } }),
      db.purchaseOrder.count({ where: { agencyId } }),
    ]);

    const [pendingApprovals, totalSpent] = await Promise.all([
      db.plannedPurchaseOrder.count({
        where: {
          agencyId,
          status: "PLANNED",
        },
      }),
      db.purchaseOrder.aggregate({
        where: {
          agencyId,
          status: "DELIVERED",
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const [pendingQuotations, completedPurchases] = await Promise.all([
      db.quotation.count({
        where: {
          agencyId,
          status: "REQUESTED",
        },
      }),
      db.purchaseOrder.count({
        where: {
          agencyId,
          status: "DELIVERED",
        },
      }),
    ]);

    return {
      totalQuotations: quotations,
      totalPlannedOrders: plannedOrders,
      totalPurchaseOrders: purchaseOrders,
      pendingApprovals,
      pendingQuotations,
      completedPurchases,
      totalSpent: totalSpent._sum.totalAmount || 0,
      conversionRate: totalSpent > 0 
        ? (completedPurchases / purchaseOrders) * 100 
        : 0,
    };
  }
}