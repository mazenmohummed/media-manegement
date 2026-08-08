import { NextResponse } from "next/server";
import { basePrisma as db } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { userId, currentPassword, newPassword } = await req.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Verify current password using 'user.password'
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect current password" },
        { status: 400 }
      );
    }

    // 2. Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // 3. Update password AND revoke ALL active sessions in an atomic transaction
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { password: newPasswordHash }, // Changed from passwordHash to password
      }),
      db.refreshToken.updateMany({
        where: { 
          userId,
          isRevoked: false,
        },
        data: { 
          isRevoked: true,
          revokedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Password changed successfully. All active sessions have been signed out.",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}