import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authRateLimiter } from "@/lib/rate-limit";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "@/lib/auth";

export async function POST(req: Request) {
  // ---------------------------------------------------------------------------
  // 1. Rate Limiting Guard
  // ---------------------------------------------------------------------------
  const rawForwardedFor = req.headers.get("x-forwarded-for");
  const clientIp = rawForwardedFor
    ? rawForwardedFor.split(",")[0].trim()
    : "127.0.0.1";

  const { success, limit, remaining, reset } = await authRateLimiter.limit(
    clientIp
  );

  if (!success) {
    return NextResponse.json(
      { success: false, message: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Main Login Logic
  // ---------------------------------------------------------------------------
  try {
    // Safe JSON Parsing
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Credentials required" },
        { status: 400 }
      );
    }

    // Fetch User & Essential Relations
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        agency: {
          select: {
            id: true,
            agencyName: true,
            agencyNo: true,
            field: true,
            timezone: true,
            defaultCurrency: true,
          },
        },
      },
    });

    // Credential & Account Status Guard
    if (!user || !user.password || user.deletedAt || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "Invalid Access Credentials" },
        { status: 401 }
      );
    }

    // Password Verification
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid Access Credentials" },
        { status: 401 }
      );
    }

    // Generate Auth Tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      agencyId: user.agencyId,
      role: user.role,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);

    const refreshTokenExpiresInDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenExpiresInDays);

    const userAgent = req.headers.get("user-agent") || null;

    // Update User Last Login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Save Refresh Token with IP and User-Agent
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        ipAddress: clientIp,
        userAgent,
      },
    });

    // Safe Non-blocking Audit Logging
    prisma.auditLog
      .create({
        data: {
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          message: `${user.name} logged in`,
          agencyId: user.agencyId,
          actorId: user.id,
        },
      })
      .catch((err) => console.error("Audit log error ignored:", err));

    // Build JSON Response & Set HttpOnly Cookie
    const response = NextResponse.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
        avatarUrl: user.avatarUrl ?? null,
        agencyId: user.agencyId ?? null,
        agencyName: user.agency?.agencyName ?? null,
        agencyNo: user.agency?.agencyNo ?? null,
        agencyField: user.agency?.field ?? null,
        departmentId: user.departmentId ?? null,
        timezone: user.agency?.timezone ?? "UTC",
        defaultCurrency: user.agency?.defaultCurrency ?? "USD",
      },
    });

    response.cookies.set("refreshToken", rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { success: false, message: "Terminal Connection Error" },
      { status: 500 }
    );
  }
}