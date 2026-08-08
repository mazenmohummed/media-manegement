import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { default as prisma } from "@/lib/prisma";
import { withAuthGuard } from "@/lib/auth/guard";

export const POST = withAuthGuard(
  "user:update_role",
  async (req: NextRequest) => {
    try {
      const agencyId = req.headers.get("x-agency-id");
      if (!agencyId) {
        return NextResponse.json({ error: "Agency context missing" }, { status: 400 });
      }

      const body = await req.json();
      const { name, url, events } = body;

      if (!name || typeof name !== "string") {
        return NextResponse.json({ error: "Webhook name is required" }, { status: 400 });
      }

      if (!url || typeof url !== "string" || !url.startsWith("http")) {
        return NextResponse.json({ error: "Valid HTTP(S) URL is required" }, { status: 400 });
      }

      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json({ error: "Select at least one event type" }, { status: 400 });
      }

      // Generate random secret for HMAC signature verification
      const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

      const webhook = await prisma.webhook.create({
        data: {
          name: name.trim(),
          url: url.trim(),
          events,
          secret,
          agencyId,
        },
      });

      return NextResponse.json(
        {
          message: "Webhook registered successfully",
          webhook,
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("[REGISTER_WEBHOOK_ERROR]", error);
      return NextResponse.json({ error: "Failed to register webhook" }, { status: 500 });
    }
  }
);