// lib/db/scoped-prisma.ts
import { db } from "@/lib/db";

export interface TenantContext {
  agencyId?: string | null;
  clientId?: string | null;
}

export function getScopedPrisma(context: TenantContext) {
  return db.$extends({
    query: {
      project: {
        async $allOperations({ operation, args, query }) {
          const queryArgs = (args || {}) as Record<string, any>;

          // For read/update/delete operations that filter via `where`
          if (operation !== "create" && operation !== "createMany") {
            queryArgs.where = {
              ...queryArgs.where,
              ...(context.clientId
                ? { clientId: context.clientId }
                : context.agencyId
                ? { agencyId: context.agencyId }
                : {}),
            };
          }

          // For write operations, automatically inject tenant context into `data`
          if (operation === "create" && queryArgs.data) {
            if (context.clientId && !queryArgs.data.clientId) {
              queryArgs.data.clientId = context.clientId;
            }
            if (context.agencyId && !queryArgs.data.agencyId) {
              queryArgs.data.agencyId = context.agencyId;
            }
          }

          return query(queryArgs as any);
        },
      },
      clientInvoice: {
        async $allOperations({ operation, args, query }) {
          const queryArgs = (args || {}) as Record<string, any>;

          if (operation !== "create" && operation !== "createMany") {
            queryArgs.where = {
              ...queryArgs.where,
              ...(context.clientId
                ? { clientId: context.clientId }
                : context.agencyId
                ? { agencyId: context.agencyId }
                : {}),
            };
          }

          if (operation === "create" && queryArgs.data) {
            if (context.clientId && !queryArgs.data.clientId) {
              queryArgs.data.clientId = context.clientId;
            }
            if (context.agencyId && !queryArgs.data.agencyId) {
              queryArgs.data.agencyId = context.agencyId;
            }
          }

          return query(queryArgs as any);
        },
      },
    },
  });
}