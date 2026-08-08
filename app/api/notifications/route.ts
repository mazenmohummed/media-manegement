import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAuthGuard } from "@/lib/auth/guard";

export const GET = withAuthGuard(
  "user:read",
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get("x-user-id");
      const agencyId = req.headers.get("x-agency-id");
      const userRole = req.headers.get("x-user-role"); // Injected by your auth middleware/guard

      if (!userId || !agencyId) {
        return NextResponse.json({ error: "Context missing" }, { status: 400 });
      }

      const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";

      // Scope condition: Admins see all agency notifications; members see only theirs
      const userScope = isAdmin ? {} : { userId };

      // 1. Query top 20 recent notifications
      const notifications = await prisma.notification.findMany({
        where: {
          agencyId,
          ...userScope,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      // 2. Query exact total unread count for badge indicators
      const unreadCount = await prisma.notification.count({
        where: {
          agencyId,
          ...userScope,
          isRead: false,
        },
      });

      return NextResponse.json({
        notifications,
        unreadCount,
      });
    } catch (error: any) {
      console.error("[GET_NOTIFICATIONS_ERROR]", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }
  }
);