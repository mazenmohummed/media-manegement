import { NextRequest, NextResponse } from "next/server";
import { Action, hasPermission, UserRole } from "@/lib/auth/permissions";

export interface AuthContext {
  userId: string;
  agencyId: string;
  role: UserRole;
}

type GuardedHandler = (
  req: NextRequest,
  context: AuthContext,
  routeProps?: any
) => Promise<NextResponse>;

/**
 * Higher-Order Function that wraps route handlers to enforce RBAC centralized checks.
 */
export function withAuthGuard(action: Action, handler: GuardedHandler) {
  return async (req: NextRequest, routeProps?: any) => {
    // Extract headers set by middleware
    const userId = req.headers.get("x-user-id");
    const agencyId = req.headers.get("x-agency-id");
    const role = req.headers.get("x-user-role") as UserRole;

    if (!userId || !agencyId || !role) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authentication context" },
        { status: 401 }
      );
    }

    // Enforce Centralized Action Permission
    if (!hasPermission(role, action)) {
      return NextResponse.json(
        { error: `Forbidden: Role '${role}' lacks '${action}' permissions` },
        { status: 403 }
      );
    }

    // Execute the actual handler with pre-validated auth context
    return handler(req, { userId, agencyId, role }, routeProps);
  };
}