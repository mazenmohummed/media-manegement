import crypto from "crypto";
import { default as prisma } from "@/lib/prisma";

export type WebhookEventType =
  | "task.completed"
  | "invoice.paid"
  | "user.created"
  | "payout.processed"
  | "task.updated"
  | "notification.created" 
  | "invoice.created";

interface DispatchParams {
  agencyId: string;
  event: WebhookEventType;
  payload: Record<string, any>;
}

export async function dispatchWebhookEvent({ agencyId, event, payload }: DispatchParams) {
  try {
    // Fetch active webhooks matching the agency and subscribed to the event
    const webhooks = await prisma.webhook.findMany({
      where: {
        agencyId,
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    if (webhooks.length === 0) return;

    const eventPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    const bodyString = JSON.stringify(eventPayload);

    // Fire HTTP POST requests asynchronously to all registered endpoints
    const promises = webhooks.map(async (webhook) => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
          "User-Agent": "SKey-Agency-Webhook/1.0",
        };

        // Compute HMAC signature if a secret is configured
        if (webhook.secret) {
          const signature = crypto
            .createHmac("sha256", webhook.secret)
            .update(bodyString)
            .digest("hex");
          headers["X-Webhook-Signature"] = signature;
        }

        await fetch(webhook.url, {
          method: "POST",
          headers,
          body: bodyString,
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
      } catch (error) {
        console.error(`[WEBHOOK_DISPATCH_FAILED] Webhook ID: ${webhook.id}, URL: ${webhook.url}`, error);
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error("[WEBHOOK_DISPATCH_ERROR]", error);
  }
}