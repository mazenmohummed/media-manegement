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

    // 1. Token doesn't exist or has expired
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

    // 2. Token Reuse Detection (Triggers if an already-rotated token is reused)
    if (existingToken.revokedAt !== null) {
      // Security measure: Revoke all active refresh tokens for this compromised user
      await prisma.refreshToken.deleteMany({
        where: { userId: existingToken.userId },
      });

      const response = NextResponse.json(
        { error: "Token reuse detected. All sessions revoked for safety." },
        { status: 403 }
      );

      response.cookies.delete({ name: "refreshToken", path: "/" });
      return response;
    }

    const { userId, user } = existingToken;

    // Extract IP & User-Agent safely
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // 3. Generate New Access and Refresh Tokens
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

    // 4. Database Transaction: Soft-delete/revoke old token & Store new rotated token
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { revokedAt: new Date() },
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

    // 5. Respond with New Access Token & Updated HTTP-Only Cookie
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