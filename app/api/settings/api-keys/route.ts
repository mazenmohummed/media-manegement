import { NextResponse, NextRequest } from "next/server";
import { default as prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/auth/api-keys";
import { withAuthGuard } from "@/lib/auth/guard";

export const POST = withAuthGuard(
  "user:update_role", // 👈 1st Arg: Action string required by your guard
  async (req: NextRequest, context: any) => { // 👈 2nd Arg: Handler function
    try {
      const body = await req.json();
      const { name, scopes, rateLimit, expiresAt } = body;

      if (!name || typeof name !== "string") {
        return NextResponse.json(
          { error: "Key name is required" },
          { status: 400 }
        );
      }

      // Extract agencyId from context / headers injected by guard/middleware
      const agencyId = req.headers.get("x-agency-id") || context?.agencyId;

      if (!agencyId) {
        return NextResponse.json(
          { error: "Agency context missing" },
          { status: 400 }
        );
      }

      const { rawKey, keyHash } = generateApiKey();

      const apiKey = await prisma.apiKey.create({
        data: {
          name: name.trim(),
          keyHash,
          scopes: Array.isArray(scopes) ? scopes : ["read:tasks"],
          rateLimit: typeof rateLimit === "number" ? rateLimit : 100,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          agencyId,
        },
        select: {
          id: true,
          name: true,
          scopes: true,
          rateLimit: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      return NextResponse.json(
        {
          message: "API key created successfully. Store this key safely!",
          apiKey: {
            ...apiKey,
            secretKey: rawKey,
          },
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("[CREATE_API_KEY_ERROR]", error);
      return NextResponse.json(
        { error: "Failed to generate API key" },
        { status: 500 }
      );
    }
  }
);