import { NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { prisma as db } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA is already active on this account" },
        { status: 400 }
      );
    }

    // 1. Generate secret (v13 syntax)
    const secret = generateSecret();

    // 2. Save the secret temporarily to the DB
    await db.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    // 3. Create keyuri format using generateURI (v13 syntax)
    const otpauthUrl = generateURI({
      issuer: "YourAppName",
      label: user.email,
      secret,
    });

    // 4. Convert keyuri to base64 Data URL QR Code
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return NextResponse.json({
      secret,
      qrCodeUrl,
    });
  } catch (error) {
    console.error("2FA Error:", error);
    return NextResponse.json(
      { error: "Failed to generate 2FA secret" },
      { status: 500 }
    );
  }
}