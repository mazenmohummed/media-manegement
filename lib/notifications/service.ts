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

    // Optional: Dispatch webhook if subscribers listen for task/notification events
    if (params.type === "DEADLINE" || params.type === "ALERT") {
      await dispatchWebhookEvent({
        agencyId: params.agencyId,
        event: "task.completed", // replace with specific webhook event if needed
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
  }
}