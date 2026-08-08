import { PrismaClient, Prisma, AuditAction } from "@prisma/client";
import { auditContextStore } from "@/lib/context/async-store";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Base raw Prisma client instance
export const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

// Models subject to automated multi-tenant query isolation
const TENANT_SCOPED_MODELS = new Set([
  "Project",
  "Client",
  "User",
  "Asset",
  "Payment",
  "Subscription",
  "Task",
  "Invoice",
  "Attachment",
  "Payout",
]);

// Models subject to automated audit logging on mutations
const AUDITED_MODELS = new Set([
  "Task",
  "Project",
  "Invoice",
  "User",
  "Attachment",
  "Client",
  "Payout",
  "Asset",
  "Payment",
  "Subscription",
]);

/**
 * Returns a tenant-scoped Prisma instance that automatically injects `agencyId` isolation
 * and fires automated AuditLog entries for mutations.
 */
export function getScopedPrisma(agencyId: string) {
  if (!agencyId) {
    throw new Error("Tenant isolation failure: Missing agencyId context.");
  }

  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const castArgs = (args || {}) as Record<string, any>;

          // ----------------------------------------------------
          // 1. TENANT ISOLATION LAYER
          // ----------------------------------------------------
          if (model && TENANT_SCOPED_MODELS.has(model)) {
            // Read queries
            if (
              [
                "findMany",
                "findFirst",
                "findFirstOrThrow",
                "count",
                "aggregate",
                "groupBy",
              ].includes(operation)
            ) {
              castArgs.where = { ...castArgs.where, agencyId };
            }

            // Single record reads (Convert findUnique to findFirst for compound filtering)
            if (["findUnique", "findUniqueOrThrow"].includes(operation)) {
              const targetModel = (basePrisma as Record<string, any>)[
                model.toLowerCase()
              ];

              if (targetModel) {
                const searchWhere = { ...castArgs.where, agencyId };
                return operation === "findUnique"
                  ? targetModel.findFirst({ ...castArgs, where: searchWhere })
                  : targetModel.findFirstOrThrow({
                      ...castArgs,
                      where: searchWhere,
                    });
              }
            }

            // Updates & Deletions
            if (
              ["update", "updateMany", "delete", "deleteMany"].includes(
                operation
              )
            ) {
              castArgs.where = { ...castArgs.where, agencyId };
            }

            // Single Creation
            if (operation === "create") {
              castArgs.data = { ...castArgs.data, agencyId };
            }

            // Bulk Creation
            if (operation === "createMany") {
              if (Array.isArray(castArgs.data)) {
                castArgs.data = castArgs.data.map(
                  (item: Record<string, any>) => ({
                    ...item,
                    agencyId,
                  })
                );
              } else if (castArgs.data) {
                castArgs.data = { ...castArgs.data, agencyId };
              }
            }
          }

          // Execute primary query
          const result = await query(args);

          // ----------------------------------------------------
          // 2. AUTOMATED AUDIT LOGGING LAYER
          // ----------------------------------------------------
          if (model && AUDITED_MODELS.has(model) && model !== "AuditLog") {
            let action: AuditAction | null = null;
            if (operation === "create" || operation === "createMany")
              action = "CREATE";
            if (operation === "update" || operation === "updateMany")
              action = "UPDATE";
            if (operation === "delete" || operation === "deleteMany")
              action = "DELETE";

            if (action) {
              const store = auditContextStore.getStore();
              const effectiveAgencyId = agencyId || store?.agencyId;

              if (effectiveAgencyId) {
                const entityId =
                  (result && typeof result === "object" && "id" in result
                    ? (result.id as string)
                    : undefined) ||
                  castArgs.where?.id ||
                  "bulk_operation";

                // Non-blocking asynchronous audit record creation via basePrisma
                basePrisma.auditLog
                  .create({
                    data: {
                      action,
                      entityType: model,
                      entityId: String(entityId),
                      agencyId: effectiveAgencyId,
                      actorId: store?.actorId || null,
                      ipAddress: store?.ipAddress || null,
                      userAgent: store?.userAgent || null,
                      metadata: {
                        operation,
                        argsWhere: castArgs.where || null,
                      },
                    },
                  })
                  .catch((err) => {
                    console.error("[AUTO_AUDIT_LOG_ERROR]", err);
                  });
              }
            }
          }

          return result;
        },
      },
    },
  });
}

export { basePrisma as prisma };
export default basePrisma;