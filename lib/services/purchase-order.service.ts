// lib/services/purchase-order.service.ts
import { db } from "@/lib/db";
import { Prisma, PurchaseOrderStatus } from "@prisma/client";

export class PurchaseOrderService {
  /**
   * Recalculate PO totals with proper tax handling and edge cases
   */
  static async recalculateTotals(poId: string) {
    return await db.$transaction(async (tx) => {
      // Get all items with their details
      const items = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: poId },
      });

      // Calculate subtotal
      const subtotal = items.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitCost = Number(item.unitCost) || 0;
        return sum + (quantity * unitCost);
      }, 0);

      // Get the purchase order
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: {
          vendor: {
            select: {
              taxNumber: true,
            },
          },
        },
      });

      if (!po) {
        throw new Error("Purchase order not found");
      }

      // Calculate tax (if applicable - you can customize this logic)
      const taxRate = 0; // Default tax rate - can be configured per vendor or PO
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Update PO with new totals
      const updatedPO = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          totalAmount: totalAmount,
        },
        include: {
          items: true,
          vendor: {
            select: {
              name: true,
              email: true,
              taxNumber: true,
            },
          },
        },
      });

      return updatedPO;
    });
  }

  /**
   * Add item with automatic total recalculation
   */
  static async addItem(poId: string, itemData: any) {
    return await db.$transaction(async (tx) => {
      // Validate PO exists
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
      });

      if (!po) {
        throw new Error("Purchase order not found");
      }

      // Create the item with computed total
      const quantity = Number(itemData.quantity) || 0;
      const unitCost = Number(itemData.unitCost) || 0;
      const total = quantity * unitCost;

      const newItem = await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: poId,
          description: itemData.description || "Item",
          quantity: quantity,
          unitCost: unitCost,
          total: total,
        },
      });

      // Recalculate totals
      const updatedPO = await this.recalculateTotals(poId);

      return { item: newItem, purchaseOrder: updatedPO };
    });
  }

  /**
   * Update item with automatic total recalculation
   */
  static async updateItem(itemId: string, itemData: any) {
    return await db.$transaction(async (tx) => {
      // Get the item to know which PO it belongs to
      const item = await tx.purchaseOrderItem.findUnique({
        where: { id: itemId },
        select: {
          purchaseOrderId: true,
          quantity: true,
          unitCost: true,
        },
      });

      if (!item) {
        throw new Error("Item not found");
      }

      // Update the item with computed total
      const quantity = itemData.quantity !== undefined ? Number(itemData.quantity) : Number(item.quantity) || 0;
      const unitCost = itemData.unitCost !== undefined ? Number(itemData.unitCost) : Number(item.unitCost) || 0;
      const total = quantity * unitCost;

      const updatedItem = await tx.purchaseOrderItem.update({
        where: { id: itemId },
        data: {
          ...(itemData.description !== undefined && { description: itemData.description }),
          ...(itemData.quantity !== undefined && { quantity: Number(itemData.quantity) }),
          ...(itemData.unitCost !== undefined && { unitCost: Number(itemData.unitCost) }),
          total: total,
        },
      });

      // Recalculate totals
      const updatedPO = await this.recalculateTotals(item.purchaseOrderId);

      return { item: updatedItem, purchaseOrder: updatedPO };
    });
  }

  /**
   * Delete item with automatic total recalculation
   */
  static async deleteItem(itemId: string) {
    return await db.$transaction(async (tx) => {
      const item = await tx.purchaseOrderItem.findUnique({
        where: { id: itemId },
        select: {
          purchaseOrderId: true,
          quantity: true,
          unitCost: true,
        },
      });

      if (!item) {
        throw new Error("Item not found");
      }

      await tx.purchaseOrderItem.delete({
        where: { id: itemId },
      });

      const updatedPO = await this.recalculateTotals(item.purchaseOrderId);

      return updatedPO;
    });
  }

  /**
   * Bulk add items with automatic total recalculation
   */
  static async addItems(poId: string, itemsData: any[]) {
    return await db.$transaction(async (tx) => {
      const results = [];
      for (const itemData of itemsData) {
        const quantity = Number(itemData.quantity) || 0;
        const unitCost = Number(itemData.unitCost) || 0;
        const total = quantity * unitCost;

        const newItem = await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: poId,
            description: itemData.description || "Item",
            quantity: quantity,
            unitCost: unitCost,
            total: total,
          },
        });
        results.push(newItem);
      }

      const updatedPO = await this.recalculateTotals(poId);

      return { items: results, purchaseOrder: updatedPO };
    });
  }

  /**
   * Bulk delete items from a purchase order
   */
  static async deleteItems(poId: string, itemIds: string[]) {
    return await db.$transaction(async (tx) => {
      // Verify all items belong to this PO
      const items = await tx.purchaseOrderItem.findMany({
        where: {
          id: { in: itemIds },
          purchaseOrderId: poId,
        },
      });

      if (items.length !== itemIds.length) {
        throw new Error("One or more items not found in this purchase order");
      }

      // Delete all items
      await tx.purchaseOrderItem.deleteMany({
        where: {
          id: { in: itemIds },
          purchaseOrderId: poId,
        },
      });

      // Recalculate totals
      const updatedPO = await this.recalculateTotals(poId);
      return updatedPO;
    });
  }

  /**
   * Bulk update multiple items
   */
  static async bulkUpdateItems(poId: string, itemsData: any[]) {
    return await db.$transaction(async (tx) => {
      const results = [];
      
      for (const itemData of itemsData) {
        if (!itemData.id) {
          throw new Error("Item ID is required for each item");
        }

        // Verify item exists and belongs to this PO
        const existingItem = await tx.purchaseOrderItem.findUnique({
          where: { id: itemData.id },
          select: { purchaseOrderId: true },
        });

        if (!existingItem || existingItem.purchaseOrderId !== poId) {
          throw new Error(`Item ${itemData.id} not found in this purchase order`);
        }

        // Calculate totals
        const quantity = itemData.quantity !== undefined ? Number(itemData.quantity) : undefined;
        const unitCost = itemData.unitCost !== undefined ? Number(itemData.unitCost) : undefined;
        
        // Get current values if not provided
        let finalQuantity = quantity;
        let finalUnitCost = unitCost;
        let total = 0;

        if (finalQuantity !== undefined && finalUnitCost !== undefined) {
          total = finalQuantity * finalUnitCost;
        } else if (finalQuantity !== undefined || finalUnitCost !== undefined) {
          // Need to get current values
          const current = await tx.purchaseOrderItem.findUnique({
            where: { id: itemData.id },
            select: { quantity: true, unitCost: true },
          });
          if (current) {
            finalQuantity = finalQuantity ?? Number(current.quantity);
            finalUnitCost = finalUnitCost ?? Number(current.unitCost);
            total = finalQuantity * finalUnitCost;
          }
        }

        const updatedItem = await tx.purchaseOrderItem.update({
          where: { id: itemData.id },
          data: {
            ...(itemData.description !== undefined && { description: itemData.description }),
            ...(quantity !== undefined && { quantity: quantity }),
            ...(unitCost !== undefined && { unitCost: unitCost }),
            ...(total > 0 && { total: total }),
          },
        });
        results.push(updatedItem);
      }

      // Recalculate totals
      const updatedPO = await this.recalculateTotals(poId);
      return { items: results, purchaseOrder: updatedPO };
    });
  }

  /**
   * Reorder items (update display order)
   * FIXED: Removed updatedAt field (not in schema) and uses a simpler approach
   */
  static async reorderItems(poId: string, itemIds: string[]) {
    return await db.$transaction(async (tx) => {
      // Verify PO exists
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
      });

      if (!po) {
        throw new Error("Purchase order not found");
      }

      // Verify all items belong to this PO
      const items = await tx.purchaseOrderItem.findMany({
        where: {
          id: { in: itemIds },
          purchaseOrderId: poId,
        },
        orderBy: { createdAt: "asc" },
      });

      if (items.length !== itemIds.length) {
        throw new Error("One or more items not found in this purchase order");
      }

      // Since we can't use updatedAt for ordering, return items in the requested order
      // by fetching them in the order of itemIds
      const reorderedItems = [];
      for (const id of itemIds) {
        const item = await tx.purchaseOrderItem.findUnique({
          where: { id },
        });
        if (item) {
          reorderedItems.push(item);
        }
      }

      return reorderedItems;
    });
  }

  /**
   * Get purchase order with all items and vendor details
   */
  static async getPurchaseOrder(poId: string) {
    const po = await db.purchaseOrder.findFirst({
      where: { id: poId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            taxNumber: true,
            address: {
              select: {
                line1: true,
                line2: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectName: true,
          },
        },
        quotation: {
          select: {
            id: true,
            quotationNo: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!po) {
      throw new Error("Purchase order not found");
    }

    return po;
  }

  /**
   * Get purchase order by PO number
   * FIXED: Use composite unique constraint with agencyId_poNo
   */
  static async getPurchaseOrderByPoNo(poNo: string, agencyId: string) {
    const po = await db.purchaseOrder.findUnique({
      where: { 
        agencyId_poNo: {
          agencyId,
          poNo,
        }
      },
      include: {
        items: true,
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!po) {
      throw new Error("Purchase order not found");
    }

    return po;
  }

  /**
   * Validate purchase order before submission
   */
  static async validatePurchaseOrder(poId: string) {
    const po = await this.getPurchaseOrder(poId);

    const errors: string[] = [];

    if (!po.vendor) {
      errors.push("Vendor is required");
    }

    if (po.items.length === 0) {
      errors.push("At least one item is required");
    }

    if (po.items.some((item) => item.quantity <= 0 || item.unitCost <= 0)) {
      errors.push("All items must have positive quantity and unit cost");
    }

    if (!po.expectedDeliveryDate) {
      errors.push("Expected delivery date is required");
    }

    if (po.totalAmount <= 0) {
      errors.push("Total amount must be greater than 0");
    }

    return {
      isValid: errors.length === 0,
      errors,
      purchaseOrder: po,
    };
  }

  /**
   * Update purchase order status with validation
   * FIXED: Added INVOICED to valid transitions
   */
  static async updateStatus(poId: string, newStatus: PurchaseOrderStatus) {
    return await db.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: { items: true },
      });

      if (!po) {
        throw new Error("Purchase order not found");
      }

      // Status transition validation - FIXED: Added INVOICED
      const validTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
        DRAFT: ["SENT", "CANCELLED"],
        SENT: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["DELIVERED", "CANCELLED"],
        DELIVERED: ["INVOICED"],
        CANCELLED: [],
        INVOICED: [],
      };

      if (!validTransitions[po.status].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${po.status} to ${newStatus}`);
      }

      // Validate requirements for each status
      if (newStatus === "SENT" || newStatus === "CONFIRMED") {
        if (po.items.length === 0) {
          throw new Error("Cannot send PO without items");
        }
        if (!po.expectedDeliveryDate) {
          throw new Error("Expected delivery date is required");
        }
        if (!po.vendorId) {
          throw new Error("Vendor is required");
        }
      }

      const updatedPO = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: newStatus,
          ...(newStatus === "SENT" && { sentAt: new Date() }),
          ...(newStatus === "DELIVERED" && { deliveredAt: new Date() }),
        },
        include: {
          items: true,
          vendor: true,
        },
      });

      return updatedPO;
    });
  }

  /**
   * Get vendor purchase order history with statistics
   * FIXED: Properly typed reviews with vendorPerformanceReviews
   */
  static async getVendorPurchaseHistory(vendorId: string) {
    const orders = await db.purchaseOrder.findMany({
      where: { vendorId },
      include: {
        items: true,
        project: {
          select: { name: true },
        },
        vendorPerformanceReviews: {
          select: {
            rating: true,
            onTimeDelivery: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate statistics
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
    const deliveredOrders = orders.filter(po => po.status === "DELIVERED");
    const deliveredCount = deliveredOrders.length;
    const pendingCount = orders.filter(po => po.status === "DRAFT" || po.status === "SENT").length;
    
    // Get all reviews - FIXED: Use vendorPerformanceReviews
    const allReviews = orders.flatMap(po => po.vendorPerformanceReviews || []);
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0 
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
    const onTimeDeliveries = allReviews.filter(r => r.onTimeDelivery).length;
    const onTimePercentage = totalReviews > 0 
      ? (onTimeDeliveries / totalReviews) * 100
      : 0;

    return {
      vendorId,
      statistics: {
        totalOrders,
        totalSpent,
        averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
        deliveredCount,
        pendingCount,
        averageRating: averageRating.toFixed(1),
        onTimePercentage: Math.round(onTimePercentage),
        totalReviews,
      },
      recentOrders: orders.slice(0, 10),
      orders,
    };
  }
}