import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma"; // Adjust path to your Prisma client instance
import { sendPasswordResetEmail } from "@/lib/email"; // Adjust path to your email utility

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 2. Anti-Enumeration Protection: Return 200 OK even if user doesn't exist
    // This prevents attackers from testing which emails exist in your DB.
    if (!user) {
      return NextResponse.json(
        {
          message:
            "If an account with that email exists, we have sent a password reset link.",
        },
        { status: 200 }
      );
    }

    // 3. Generate secure raw token & calculate its SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // 4. Set expiration period (e.g., 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 5. Invalidate existing active reset tokens for this user & create new one
    await prisma.$transaction([
      // Soft-invalidate or cleanup old unused tokens for this user
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      }),
      // Store the hashed token tied to userId
      prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    // 6. Build reset link with the RAW token (never send the hash)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    // 7. Dispatch Email
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    });

    return NextResponse.json(
      {
        message:
          "If an account with that email exists, we have sent a password reset link.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}