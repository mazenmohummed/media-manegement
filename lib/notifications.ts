// lib/notifications.ts
import  prisma  from "@/lib/prisma";

export async function createNotification({
  title,
  message,
  type,
  userId,
  agencyId,
}: {
  title: string;
  message: string;
  type: string;
  userId: string;
  agencyId: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        title,
        message,
        type,
        userId,
        agencyId,
      },
    });
  } catch (error) {
    console.error("CREATE_NOTIFICATION_CRITICAL_FAILURE:", error);
    throw error; // Rethrow to see the error in the PATCH log
  }
}