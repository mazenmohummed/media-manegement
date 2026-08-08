import prisma from "@/lib/prisma";
import { AuditAction, Prisma } from "@prisma/client";
import { auditContextStore } from "@/lib/context/async-store";

interface LogEventParams {
  action: AuditAction;
  entityType: string;
  entityId: string;
  message?: string;
  metadata?: Record<string, any>;
  agencyId?: string;
  actorId?: string;
}

export async function logAuditParams(params: LogEventParams) {
  try {
    const store = auditContextStore.getStore();

    const agencyId = params.agencyId || store?.agencyId;
    if (!agencyId) {
      console.warn("[AUDIT_LOG_SKIPPED] Missing agencyId context for manual audit log");
      return;
    }

    return await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        message: params.message || null,
        metadata: params.metadata ?? Prisma.DbNull, // Use Prisma.DbNull for Prisma Json fields
        agencyId,
        actorId: params.actorId || store?.actorId || null,
        ipAddress: store?.ipAddress || null,
        userAgent: store?.userAgent || null,
      },
    });
  } catch (error) {
    console.error("[MANUAL_AUDIT_LOG_ERROR]", error);
  }
}