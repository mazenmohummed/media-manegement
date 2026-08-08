import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const rawRefreshToken = cookieStore.get("refreshToken")?.value;

    if (!rawRefreshToken) {
      return NextResponse.json(
        { error: "Refresh token missing" },
        { status: 401 }
      );
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);

    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // 1. Missing Token or Expired
    if (!existingToken || existingToken.expiresAt < new Date()) {
      if (existingToken) {
        await prisma.refreshToken.delete({ where: { id: existingToken.id } });
      }

      const response = NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );

      response.cookies.delete("refreshToken");
      return response;
    }

    // 2. Token Reuse Detection
    // If token is flagged as revoked, a bad actor may be reusing a stolen token.
    if (existingToken.isRevoked || existingToken.revokedAt !== null) {
      // Invalidate ALL active refresh tokens for this compromised account
      await prisma.refreshToken.updateMany({
        where: { userId: existingToken.userId, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      });

      const response = NextResponse.json(
        { error: "Security Alert: Token reuse detected. All sessions revoked." },
        { status: 403 }
      );

      response.cookies.delete("refreshToken");
      return response;
    }

    const { userId, user } = existingToken;

    // Safely extract IP & User-Agent
    const rawForwarded = req.headers.get("x-forwarded-for");
    const ipAddress = rawForwarded
      ? rawForwarded.split(",")[0].trim()
      : req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    // 3. Generate new Access & Refresh tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      agencyId: user.agencyId,
      role: user.role,
    });

    const newRawRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRawRefreshToken);

    const refreshTokenExpiresInDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenExpiresInDays);

    // 4. Atomic Transaction: Revoke existing token and issue rotated token
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      }),
      prisma.refreshToken.create({
        data: {
          tokenHash: newRefreshTokenHash,
          userId,
          expiresAt,
          ipAddress,
          userAgent,
        },
      }),
    ]);

    // 5. Send response with rotated HTTP-only cookie
    const response = NextResponse.json(
      {
        success: true,
        accessToken: newAccessToken,
      },
      { status: 200 }
    );

    response.cookies.set("refreshToken", newRawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}