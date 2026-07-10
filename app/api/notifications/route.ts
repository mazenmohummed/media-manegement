// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN";

  const notifications = await prisma.notification.findMany({
    where: {
      agencyId: session.user.agencyId,
      // Admins see all agency notifications; regular users see only their own
      ...(isAdmin ? {} : { userId: session.user.id }),
      isRead: false,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    notifications,
    unreadCount: notifications.length,
  });
}