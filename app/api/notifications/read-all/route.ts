import { NextRequest, NextResponse } from "next/server";
import { default as prisma } from "@/lib/prisma";
import { withAuthGuard } from "@/lib/auth/guard";

export const PATCH = withAuthGuard(
  "user:read",
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get("x-user-id");
      const agencyId = req.headers.get("x-agency-id");

      if (!userId || !agencyId) {
        return NextResponse.json({ error: "Context missing" }, { status: 400 });
      }

      await prisma.notification.updateMany({
        where: {
          userId,
          agencyId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({ message: "All notifications marked as read" });
    } catch (error: any) {
      console.error("[MARK_ALL_READ_ERROR]", error);
      return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
    }
  }
);