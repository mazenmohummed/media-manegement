import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ message: "Credentials required" }, { status: 400 });
    }

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
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user || !user.password || user.deletedAt || !user.isActive) {
      return NextResponse.json({ message: "Invalid Access Credentials" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ message: "Invalid Access Credentials" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog
      .create({
        data: {
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          message: `${user.name} signed in`,
          agencyId: user.agencyId,
          actorId: user.id,
        },
      })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
        avatarUrl: user.avatarUrl,
        agencyId: user.agencyId,
        agencyName: user.agency.agencyName,
        agencyNo: user.agency.agencyNo,
        agencyField: user.agency.field,
        departmentId: user.departmentId,
        departmentName: user.department?.name ?? null,
        timezone: user.agency.timezone,
        defaultCurrency: user.agency.defaultCurrency,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ message: "Terminal Connection Error" }, { status: 500 });
  }
}
