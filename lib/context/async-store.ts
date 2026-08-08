import { AsyncLocalStorage } from "node:async_hooks";

export interface AuditContext {
  actorId?: string;
  agencyId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const auditContextStore = new AsyncLocalStorage<AuditContext>();