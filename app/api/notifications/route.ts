// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── GET /api/notifications ──────────────────────────────────────────────
export const GET = withAuthGuard("notification:read", async (req: NextRequest, { agencyId, userId }) => {
  try {
    const db = getScopedPrisma(agencyId);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: any = {
      userId: userId,
      agencyId: agencyId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await db.notification.count({
      where: {
        userId: userId,
        agencyId: agencyId,
        isRead: false,
      },
    });

    // ✅ Include actionUrl in the response
    const formattedNotifications = notifications.map(n => ({
      ...n,
      actionUrl: n.actionUrl || null,
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("[GET_NOTIFICATIONS_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
});

// ─── PATCH /api/notifications/[id] ──────────────────────────────────────
export const PATCH = withAuthGuard("notification:update", async (
  req: NextRequest,
  { agencyId, userId },
  routeProps: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await routeProps.params;
    const db = getScopedPrisma(agencyId);

    const notification = await db.notification.findFirst({
      where: {
        id: id,
        userId: userId,
        agencyId: agencyId,
      },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error("[UPDATE_NOTIFICATION_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notification" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/notifications/[id] ──────────────────────────────────────
export const DELETE = withAuthGuard("notification:delete", async (
  req: NextRequest,
  { agencyId, userId },
  routeProps: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await routeProps.params;
    const db = getScopedPrisma(agencyId);

    const notification = await db.notification.findFirst({
      where: {
        id: id,
        userId: userId,
        agencyId: agencyId,
      },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Notification deleted" });
  } catch (error: any) {
    console.error("[DELETE_NOTIFICATION_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete notification" },
      { status: 500 }
    );
  }
});