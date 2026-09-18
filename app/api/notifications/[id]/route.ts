// app/api/notifications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthGuard } from '@/lib/auth/guard';
import { getScopedPrisma } from '@/lib/prisma';

// ─── PATCH /api/notifications/[id] ──────────────────────────────────────
export const PATCH = withAuthGuard(
  'notification:update',
  async (
    req: NextRequest,
    { agencyId, userId },
    routeProps: { params: Promise<{ id: string }> } // ✅ id param
  ) => {
    try {
      const { id } = await routeProps.params;
      const db = getScopedPrisma(agencyId);

      const notification = await db.notification.findFirst({
        where: {
          id,
          userId,
          agencyId,
        },
      });

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }

      const updated = await db.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });

      return NextResponse.json({ success: true, notification: updated });
    } catch (error: any) {
      console.error('[UPDATE_NOTIFICATION_ERROR]', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update notification' },
        { status: 500 }
      );
    }
  }
);

// ─── DELETE /api/notifications/[id] ─────────────────────────────────────
export const DELETE = withAuthGuard(
  'notification:delete',
  async (
    req: NextRequest,
    { agencyId, userId },
    routeProps: { params: Promise<{ id: string }> } // ✅ id param
  ) => {
    try {
      const { id } = await routeProps.params;
      const db = getScopedPrisma(agencyId);

      const notification = await db.notification.findFirst({
        where: {
          id,
          userId,
          agencyId,
        },
      });

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }

      await db.notification.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error: any) {
      console.error('[DELETE_NOTIFICATION_ERROR]', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete notification' },
        { status: 500 }
      );
    }
  }
);