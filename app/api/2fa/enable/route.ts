import { NextResponse } from "next/server";
import { verify } from "otplib";
import { basePrisma as db } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, token } = await req.json();

    if (!token || token.length !== 6) {
      return NextResponse.json(
        { error: "A valid 6-digit code is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA setup has not been initiated" },
        { status: 400 }
      );
    }

    // 1. Verify the code (v13 syntax is async and returns { valid, delta })
    const result = await verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!result.valid) {
      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    // 2. Mark 2FA as fully enabled
    await db.user.update({
      where: { id: userId },
      data: { 
        twoFactorEnabled: true 
      },
    });

    return NextResponse.json({
      success: true,
      message: "Two-Factor Authentication successfully enabled!",
    });
  } catch (error) {
    console.error("2FA Verification Error:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 }
    );
  }
}