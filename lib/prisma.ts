import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Base Prisma Client Singleton
export const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

/**
 * Returns a tenant-scoped Prisma instance that automatically injects
 * `agencyId` filtering into read, write, update, and delete queries.
 */
export function getScopedPrisma(agencyId: string) {
  if (!agencyId) {
    throw new Error("Tenant isolation failure: Missing agencyId context.");
  }

  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Models requiring multi-tenant scoping
          const tenantScopedModels = [
            "Project",
            "Client",
            "User",
            "Asset",
            "Payment",
            "Subscription",
          ];

          if (tenantScopedModels.includes(model)) {
            // Type assertion for mutation safety
            const castArgs = args as Record<string, any>;

            // 1. Read Operations (findMany, findFirst, count, aggregate, groupBy)
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

            // 2. Single Record Read Operations (Convert findUnique to findFirst for compound filter support)
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

            // 3. Updates & Deletions
            if (
              ["update", "updateMany", "delete", "deleteMany"].includes(
                operation
              )
            ) {
              castArgs.where = { ...castArgs.where, agencyId };
            }

            // 4. Record Creation
            if (operation === "create") {
              castArgs.data = { ...castArgs.data, agencyId };
            }

            // 5. Bulk Creation
            if (operation === "createMany") {
              if (Array.isArray(castArgs.data)) {
                castArgs.data = castArgs.data.map((item: Record<string, any>) => ({
                  ...item,
                  agencyId,
                }));
              } else if (castArgs.data) {
                castArgs.data = { ...castArgs.data, agencyId };
              }
            }
          }

          return query(args);
        },
      },
    },
  });
}

// Export default base client for un-scoped/system queries
export default basePrisma;