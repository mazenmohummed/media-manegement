import { NextRequest, NextResponse } from "next/server";
import { Action, hasPermission, UserRole } from "@/lib/auth/permissions";
import { auditContextStore } from "@/lib/context/async-store";

export interface AuthContext {
  userId: string;
  agencyId: string;
  role: UserRole;
}

export type GuardedHandler<T = any> = (
  req: NextRequest,
  context: AuthContext,
  routeProps: T
) => Promise<NextResponse>;

export function withAuthGuard<T = any>(action: Action, handler: GuardedHandler<T>) {
  return async (req: NextRequest, routeProps: T) => {
    const userId = req.headers.get("x-user-id");
    const agencyId = req.headers.get("x-agency-id");
    const role = req.headers.get("x-user-role") as UserRole;

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const userAgent = req.headers.get("user-agent") || undefined;

    if (!userId || !agencyId || !role) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authentication context" },
        { status: 401 }
      );
    }

    if (!hasPermission(role, action)) {
      return NextResponse.json(
        { error: `Forbidden: Role '${role}' lacks '${action}' permissions` },
        { status: 403 }
      );
    }

    // Wrap the request context in AsyncLocalStorage for the Prisma Extension to pick up
    return auditContextStore.run(
      { actorId: userId, agencyId, ipAddress, userAgent },
      async () => {
        return handler(req, { userId, agencyId, role }, routeProps);
      }
    );
  };
}