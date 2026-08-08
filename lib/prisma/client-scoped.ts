import { getScopedPrisma } from "@/lib/prisma";

/**
 * Returns a Prisma instance scoped to both the Agency (tenant) AND the specific Client record.
 */
export function getClientPortalPrisma(agencyId: string, clientId: string) {
  if (!clientId) {
    throw new Error("Client boundary failure: Missing clientId context.");
  }

  const agencyScoped = getScopedPrisma(agencyId);

  return agencyScoped.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const castArgs = args as Record<string, any>;

          // Models that belong directly to a Client
          const CLIENT_BOUND_MODELS = new Set([
            "Project",
            "Invoice",
            "Asset",
            "Task",
          ]);

          if (model && CLIENT_BOUND_MODELS.has(model)) {
            if (
              [
                "findMany",
                "findFirst",
                "findFirstOrThrow",
                "count",
                "aggregate",
              ].includes(operation)
            ) {
              castArgs.where = { ...castArgs.where, clientId };
            }

            if (["update", "updateMany", "delete", "deleteMany"].includes(operation)) {
              castArgs.where = { ...castArgs.where, clientId };
            }
          }

          return query(args);
        },
      },
    },
  });
}