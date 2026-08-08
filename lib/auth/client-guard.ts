import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/lib/auth/permissions";
import { auditContextStore } from "@/lib/context/async-store";

export interface ClientAuthContext {
  userId: string;
  agencyId: string;
  clientId: string;
  role: UserRole;
}

export type ClientGuardedHandler<T = any> = (
  req: NextRequest,
  context: ClientAuthContext,
  routeProps: T
) => Promise<NextResponse>;

/**
 * Higher-order guard specifically enforcing CLIENT role and clientId presence.
 */
export function withClientGuard<T = any>(handler: ClientGuardedHandler<T>) {
  return async (req: NextRequest, routeProps: T) => {
    const userId = req.headers.get("x-user-id");
    const agencyId = req.headers.get("x-agency-id");
    const role = req.headers.get("x-user-role") as UserRole;
    const clientId = req.headers.get("x-client-id"); // Injected by auth middleware/session

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // 1. Verify basic identity
    if (!userId || !agencyId || !role) {
      return NextResponse.json(
        { error: "Unauthorized: Missing identity context" },
        { status: 401 }
      );
    }

    // 2. Strict CLIENT role validation
    if (role !== "CLIENT") {
      return NextResponse.json(
        { error: "Forbidden: Route restricted exclusively to client users" },
        { status: 403 }
      );
    }

    // 3. Strict clientId boundary check
    if (!clientId) {
      return NextResponse.json(
        { error: "Forbidden: Account is not associated with a Client record" },
        { status: 403 }
      );
    }

    // Store execution context for audit logging
    return auditContextStore.run(
      { actorId: userId, agencyId, ipAddress, userAgent },
      async () => {
        return handler(req, { userId, agencyId, clientId, role }, routeProps);
      }
    );
  };
}