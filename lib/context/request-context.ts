// lib/context/request-context.ts
import { AsyncLocalStorage } from "node:async_hooks";
import { headers } from "next/headers";

export interface RequestContext {
  actorId?: string;
  agencyId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

/**
 * Wraps Next.js App Router API handlers to bind header values to AsyncLocalStorage
 */
export function withAuditContext<T>(handler: (req: Request, ...args: any[]) => Promise<T>) {
  return async (req: Request, ...args: any[]) => {
    const headerList = await headers();
    
    const context: RequestContext = {
      actorId: headerList.get("x-user-id") || undefined,
      agencyId: headerList.get("x-agency-id") || undefined,
      ipAddress: headerList.get("x-ip-address") || headerList.get("x-forwarded-for") || "127.0.0.1",
      userAgent: headerList.get("user-agent") || undefined,
    };

    return requestContextStore.run(context, () => handler(req, ...args));
  };
}