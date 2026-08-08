import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAuthGuard, AuthContext } from "@/lib/auth/guard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: Mark a single notification as read
export const PATCH = withAuthGuard(
  "user:read",
  async (
    _req: NextRequest,
    authCtx: AuthContext,
    routeProps: RouteParams
  ) => {
    try {
      const { id } = await routeProps.params;
      const { userId, agencyId, role } = authCtx;

      const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

      const updated = await prisma.notification.updateMany({
        where: {
          id,
          agencyId,
          ...(isAdmin ? {} : { userId }),
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      if (updated.count === 0) {
        return NextResponse.json(
          { error: "Notification not found or unauthorized" },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: "Notification marked as read", ok: true });
    } catch (error: any) {
      console.error("[NOTIFICATION_PATCH_ERROR]", error);
      return NextResponse.json(
        { error: "Failed to update notification" },
        { status: 500 }
      );
    }
  }
);

// DELETE: Remove a notification
export const DELETE = withAuthGuard(
  "user:read",
  async (
    _req: NextRequest,
    authCtx: AuthContext,
    routeProps: RouteParams
  ) => {
    try {
      const { id } = await routeProps.params;
      const { userId, agencyId, role } = authCtx;

      const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

      const deleted = await prisma.notification.deleteMany({
        where: {
          id,
          agencyId,
          ...(isAdmin ? {} : { userId }),
        },
      });

      if (deleted.count === 0) {
        return NextResponse.json(
          { error: "Notification not found or unauthorized" },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: "Notification deleted", ok: true });
    } catch (error: any) {
      console.error("[NOTIFICATION_DELETE_ERROR]", error);
      return NextResponse.json(
        { error: "Failed to delete notification" },
        { status: 500 }
      );
    }
  }
);