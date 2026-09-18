// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthGuard } from '@/lib/auth/guard';
import { getScopedPrisma } from '@/lib/prisma';

// ─── GET /api/notifications ─────────────────────────────────────────────
export const GET = withAuthGuard(
  'notification:read',
  async (req: NextRequest, { agencyId, userId }) => {
    try {
      const db = getScopedPrisma(agencyId);
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '50');
      const unreadOnly = searchParams.get('unreadOnly') === 'true';

      const where: any = {
        userId,
        agencyId,
      };

      if (unreadOnly) {
        where.isRead = false;
      }

      const notifications = await db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const unreadCount = await db.notification.count({
        where: {
          userId,
          agencyId,
          isRead: false,
        },
      });

      const formattedNotifications = notifications.map((n) => ({
        ...n,
        actionUrl: n.actionUrl || null,
      }));

      return NextResponse.json({
        success: true,
        notifications: formattedNotifications,
        unreadCount,
      });
    } catch (error: any) {
      console.error('[GET_NOTIFICATIONS_ERROR]', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch notifications' },
        { status: 500 }
      );
    }
  }
);