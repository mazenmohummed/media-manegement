// @/lib/notifications/service.ts
import { default as prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

interface CreateNotificationParams {
  userId: string;
  agencyId: string;
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        agencyId: params.agencyId,
        title: params.title,
        message: params.message,
        type: params.type || "SYSTEM",
        actionUrl: params.actionUrl || null,
      },
    });

    if (params.type === "DEADLINE" || params.type === "ALERT") {
      await dispatchWebhookEvent({
        agencyId: params.agencyId,
        // Use a valid WebhookEventType supported by your dispatcher (e.g., "task.updated")
        event: "task.updated", 
        payload: {
          notificationId: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
        },
      });
    }

    return notification;
  } catch (error) {
    console.error("[CREATE_NOTIFICATION_ERROR]", error);
    throw error;
  }
}