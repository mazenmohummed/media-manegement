// lib/triggers/purchase-order.triggers.ts
import { db } from "@/lib/db";
import { PurchaseOrderStatus, NotificationType } from "@prisma/client";

export interface TriggerContext {
  agencyId: string;
  userId?: string;
  triggerType: 'CREATE' | 'UPDATE' | 'DELETE';
  previousState?: any;
  currentState?: any;
}

export class PurchaseOrderTriggers {
  /**
   * Trigger: Recalculate PO totals whenever an item is created, updated, or deleted
   */
  static async onItemChange(purchaseOrderId: string) {
    const { PurchaseOrderService } = await import("../services/purchase-order.service");
    return await PurchaseOrderService.recalculateTotals(purchaseOrderId);
  }

  /**
   * Trigger: Handle PO status changes (update related records, notifications, etc.)
   */
  static async onStatusChange(
    poId: string, 
    oldStatus: PurchaseOrderStatus, 
    newStatus: PurchaseOrderStatus, 
    context: TriggerContext
  ) {
    // Use the regular db instance directly to avoid type issues
    const po = await db.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        vendor: true,
        items: true,
        quotation: true,
      },
    });

    if (!po) {
      throw new Error("Purchase order not found");
    }

    // ─── Status Transition Actions ──────────────────────────────────────────

    switch (newStatus) {
      case "SENT":
        // Validate that PO has items before sending
        if (po.items.length === 0) {
          throw new Error("Cannot send purchase order without items");
        }
        // Set sent timestamp
        await db.purchaseOrder.update({
          where: { id: poId },
          data: { sentAt: new Date() },
        });
        break;

      case "CONFIRMED":
        // Validate that PO has been sent before confirming
        if (oldStatus !== "SENT" && oldStatus !== "DRAFT") {
          throw new Error("Purchase order must be sent before confirming");
        }
        // Update quotation status if linked
        if (po.quotationId) {
          await db.quotation.update({
            where: { id: po.quotationId },
            data: { status: "SELECTED" },
          });
        }
        break;

      case "DELIVERED":
        // Validate that PO is confirmed before delivery
        if (oldStatus !== "CONFIRMED") {
          throw new Error("Purchase order must be confirmed before marking as delivered");
        }
        // Set delivered timestamp
        await db.purchaseOrder.update({
          where: { id: poId },
          data: { deliveredAt: new Date() },
        });
        // Create notification for vendor performance review
        if (context.userId) {
          await db.notification.create({
            data: {
              userId: context.userId,
              agencyId: context.agencyId,
              title: "Purchase Order Delivered",
              message: `Purchase Order ${po.poNo} has been marked as delivered. Please review vendor performance.`,
              type: "SUCCESS",
              actionUrl: `/dashboard/vendors/purchase-orders/${poId}`,
            },
          });
        }
        break;

      case "CANCELLED":
        // Update quotation status if linked
        if (po.quotationId) {
          await db.quotation.update({
            where: { id: po.quotationId },
            data: { status: "REQUESTED" },
          });
        }
        break;

      case "INVOICED":
        // Validate that PO is delivered before invoicing
        if (oldStatus !== "DELIVERED") {
          throw new Error("Purchase order must be delivered before invoicing");
        }
        break;
    }

    return po;
  }

  /**
   * Trigger: Validate PO before any operation
   */
  static async validatePurchaseOrder(
    poId: string, 
    context: TriggerContext
  ): Promise<{ valid: boolean; errors: string[] }> {
    const po = await db.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        items: true,
        vendor: true,
      },
    });

    if (!po) {
      return { valid: false, errors: ["Purchase order not found"] };
    }

    const errors: string[] = [];

    // Validate vendor
    if (!po.vendorId) {
      errors.push("Vendor is required");
    }

    // Validate items
    if (po.items.length === 0) {
      errors.push("At least one item is required");
    }

    // Validate item values
    for (const item of po.items) {
      if (item.quantity <= 0) {
        errors.push(`Item "${item.description}" has invalid quantity (must be > 0)`);
      }
      if (item.unitCost < 0) {
        errors.push(`Item "${item.description}" has invalid unit cost (must be >= 0)`);
      }
    }

    // Validate expected delivery date for non-draft orders
    if (po.status !== "DRAFT" && !po.expectedDeliveryDate) {
      errors.push("Expected delivery date is required for orders not in draft status");
    }

    // Validate total amount
    if (po.totalAmount <= 0) {
      errors.push("Total amount must be greater than 0");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Trigger: Auto-sync with quotation when PO changes
   */
  static async syncQuotation(poId: string, context: TriggerContext) {
    const po = await db.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        items: true,
      },
    });

    if (!po || !po.quotationId) {
      return null;
    }

    // Calculate total from items - with proper typing
    const total = po.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0);

    // Update quotation with PO total
    const updatedQuotation = await db.quotation.update({
      where: { id: po.quotationId },
      data: {
        amount: total,
        currency: po.currency,
        status: po.status === "DELIVERED" ? "SELECTED" : "REQUESTED",
      },
    });

    return updatedQuotation;
  }

  /**
   * Trigger: Create notifications for stakeholders
   */
  static async createStatusNotifications(
    poId: string, 
    oldStatus: PurchaseOrderStatus, 
    newStatus: PurchaseOrderStatus, 
    context: TriggerContext
  ) {
    const po = await db.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        vendor: true,
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!po) return;

    const notifications: any[] = [];

    // Status change notification
    const messageMap: Record<PurchaseOrderStatus, string> = {
      DRAFT: "Purchase order has been created as a draft",
      SENT: `Purchase order ${po.poNo} has been sent to ${po.vendor?.name}`,
      CONFIRMED: `Purchase order ${po.poNo} has been confirmed by ${po.vendor?.name}`,
      DELIVERED: `Purchase order ${po.poNo} has been delivered`,
      CANCELLED: `Purchase order ${po.poNo} has been cancelled`,
      INVOICED: `Purchase order ${po.poNo} has been invoiced`,
    };

    // Notify the user who performed the action
    if (context.userId) {
      notifications.push({
        userId: context.userId,
        agencyId: context.agencyId,
        title: `PO Status Updated: ${newStatus}`,
        message: messageMap[newStatus] || `Purchase order ${po.poNo} status changed to ${newStatus}`,
        type: newStatus === "DELIVERED" ? "SUCCESS" : newStatus === "CANCELLED" ? "WARNING" : "SYSTEM",
        actionUrl: `/dashboard/vendors/purchase-orders/${poId}`,
      });
    }

    // Notify project manager if project is linked
    if (po.projectId) {
      const projectManager = await db.user.findFirst({
      where: {
        agencyId: context.agencyId,
        isActive: true,
        role: { in: ['ADMIN', 'OPERATOR', 'TEAMLEADER'] },
        resourceAllocations: {
          some: { projectId: po.projectId },
        },
      },
    });

      if (projectManager && projectManager.id !== context.userId) {
        notifications.push({
          userId: projectManager.id,
          agencyId: context.agencyId,
          title: `Purchase Order Update: ${po.poNo}`,
          message: `Purchase order ${po.poNo} for ${po.vendor?.name} is now ${newStatus}`,
          type: "SYSTEM",
          actionUrl: `/dashboard/vendors/purchase-orders/${poId}`,
        });
      }
    }

    // Create all notifications
    for (const notif of notifications) {
      await db.notification.create({
        data: notif,
      });
    }

    return notifications;
  }

  /**
   * Trigger: Handle cascade operations when PO is deleted
   */
  static async onDelete(poId: string, context: TriggerContext) {
    const po = await db.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        items: true,
        vendorPerformanceReviews: true,
      },
    });

    if (!po) return;

    // Delete all related records
    await db.$transaction(async (tx: any) => {
      // Delete performance reviews
      if (po.vendorPerformanceReviews.length > 0) {
        await tx.vendorPerformanceReview.deleteMany({
          where: { purchaseOrderId: poId },
        });
      }

      // Delete items
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: poId },
      });

      // If linked to quotation, update quotation
      if (po.quotationId) {
        const quotation = await tx.quotation.findUnique({
          where: { id: po.quotationId },
          select: { amount: true },
        });
        if (quotation && po.totalAmount) {
          await tx.quotation.update({
            where: { id: po.quotationId },
            data: {
              amount: Math.max(0, (quotation.amount || 0) - po.totalAmount),
            },
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          agencyId: context.agencyId,
          actorId: context.userId || "system",
          action: "DELETE",
          entityType: "PurchaseOrder",
          entityId: poId,
          message: `Purchase order ${po.poNo} was deleted`,
          metadata: {
            vendorName: po.vendorId,
            totalAmount: po.totalAmount,
            itemCount: po.items.length,
          },
        },
      });
    });

    return { success: true };
  }

  /**
   * Main trigger handler
   */
  static async handleTrigger(
    poId: string,
    triggerType: 'CREATE' | 'UPDATE' | 'DELETE',
    context: TriggerContext,
    options?: {
      oldStatus?: PurchaseOrderStatus;
      newStatus?: PurchaseOrderStatus;
    }
  ) {
    try {
      switch (triggerType) {
        case 'CREATE':
          // Validate and create notifications
          const createValidation = await this.validatePurchaseOrder(poId, context);
          if (!createValidation.valid) {
            throw new Error(`Validation failed: ${createValidation.errors.join(', ')}`);
          }
          break;

        case 'UPDATE':
          // Handle status changes
          if (options?.oldStatus && options?.newStatus && options.oldStatus !== options.newStatus) {
            await this.onStatusChange(poId, options.oldStatus, options.newStatus, context);
            await this.createStatusNotifications(poId, options.oldStatus, options.newStatus, context);
          }
          
          // Sync with quotation
          await this.syncQuotation(poId, context);
          
          // Validate after update
          const updateValidation = await this.validatePurchaseOrder(poId, context);
          if (!updateValidation.valid) {
            throw new Error(`Validation failed: ${updateValidation.errors.join(', ')}`);
          }
          break;

        case 'DELETE':
          await this.onDelete(poId, context);
          break;
      }

      return { success: true };
    } catch (error: any) {
      console.error(`[PurchaseOrderTrigger:${triggerType}] Error:`, error);
      throw error;
    }
  }
}